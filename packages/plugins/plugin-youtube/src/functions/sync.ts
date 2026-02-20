//
// Copyright 2024 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Chunk from 'effect/Chunk';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Predicate from 'effect/Predicate';
import * as Schema from 'effect/Schema';
import * as Stream from 'effect/Stream';

import { Database, Filter, Obj, Query, Type } from '@dxos/echo';
import type { Queue } from '@dxos/echo-db';
import { QueueService, defineFunction } from '@dxos/functions';
import { log } from '@dxos/log';

import * as Channel from '../types/Channel';
import type { YouTubeVideo } from '../types/Video';

import { YouTube } from './apis';
import { GoogleCredentials } from './services/google-credentials';
import { fetchTranscript } from './transcript';

const STREAMING_CONFIG = {
  /** Videos per page from YouTube API. */
  maxResults: 50,
  /** Parallel transcript fetches. */
  transcriptFetchConcurrency: 3,
  /** In-flight video buffer. */
  bufferSize: 10,
  /** Videos per queue append. */
  queueBatchSize: 10,
  /** Max videos in restricted mode. */
  restrictedMax: 20,
} as const;

/**
 * Extracts channel ID from various YouTube URL formats.
 */
const extractChannelInfo = (
  urlOrHandle: string,
): { type: 'id'; value: string } | { type: 'handle'; value: string } | { type: 'url'; value: string } => {
  const trimmed = urlOrHandle.trim();

  if (trimmed.startsWith('@')) {
    return { type: 'handle', value: trimmed.slice(1) };
  }

  if (trimmed.startsWith('UC') && trimmed.length === 24) {
    return { type: 'id', value: trimmed };
  }

  try {
    const url = new URL(trimmed);
    const pathname = url.pathname;

    if (pathname.startsWith('/channel/')) {
      const channelId = pathname.split('/')[2];
      if (channelId) {
        return { type: 'id', value: channelId };
      }
    }

    if (pathname.startsWith('/@')) {
      return { type: 'handle', value: pathname.slice(2) };
    }

    if (pathname.startsWith('/c/') || pathname.startsWith('/user/')) {
      const name = pathname.split('/')[2];
      if (name) {
        return { type: 'handle', value: name };
      }
    }
  } catch {
    if (/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
      return { type: 'handle', value: trimmed };
    }
  }

  return { type: 'url', value: trimmed };
};

/**
 * Gets the uploads playlist ID for a channel.
 */
const getUploadsPlaylistId = Effect.fn(function* (channelInfo: { type: string; value: string }) {
  let channelResponse;

  if (channelInfo.type === 'id') {
    channelResponse = yield* YouTube.getChannel(channelInfo.value);
  } else {
    channelResponse = yield* YouTube.getChannelByHandle(channelInfo.value);
  }

  const channel = channelResponse.items[0];
  if (!channel) {
    return yield* Effect.fail(new Error(`Channel not found: ${channelInfo.value}`));
  }

  const uploadsPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsPlaylistId) {
    return yield* Effect.fail(new Error(`No uploads playlist found for channel: ${channelInfo.value}`));
  }

  return {
    channelId: channel.id,
    channelTitle: channel.snippet?.title ?? '',
    uploadsPlaylistId,
  };
});

/**
 * Fetches videos from an uploads playlist, returning them from newest to oldest.
 */
const fetchPlaylistVideos = (uploadsPlaylistId: string, maxVideos?: number) => {
  let videoCount = 0;

  return Stream.unfoldChunkEffect({ pageToken: Option.none<string>(), done: false }, (state) =>
    Effect.gen(function* () {
      if (state.done || (maxVideos && videoCount >= maxVideos)) {
        return Option.none();
      }

      const response = yield* YouTube.listPlaylistItems(
        uploadsPlaylistId,
        STREAMING_CONFIG.maxResults,
        Option.getOrUndefined(state.pageToken),
      );

      const videoIds = response.items
        .map((item) => item.snippet?.resourceId?.videoId)
        .filter((id): id is string => Boolean(id));

      log('fetched playlist items', {
        count: videoIds.length,
        pageToken: Option.getOrUndefined(state.pageToken),
        hasMore: Boolean(response.nextPageToken),
      });

      videoCount += videoIds.length;

      const nextState = {
        pageToken: Option.fromNullable(response.nextPageToken),
        done: !response.nextPageToken || (maxVideos !== undefined && videoCount >= maxVideos),
      };

      return Option.some([Chunk.fromIterable(videoIds), nextState]);
    }),
  );
};

/**
 * Maps YouTube API video item to YouTubeVideo type.
 */
const mapVideo = (item: YouTube.VideoItem, transcript?: { segments: unknown[]; fullText: string }): YouTubeVideo => ({
  title: item.snippet?.title ?? 'Untitled',
  videoId: item.id,
  description: item.snippet?.description,
  url: `https://www.youtube.com/watch?v=${item.id}`,
  thumbnailUrl:
    item.snippet?.thumbnails?.high?.url ??
    item.snippet?.thumbnails?.medium?.url ??
    item.snippet?.thumbnails?.default?.url,
  channelTitle: item.snippet?.channelTitle,
  publishedAt: item.snippet?.publishedAt ?? new Date().toISOString(),
  duration: item.contentDetails?.duration,
  viewCount: item.statistics?.viewCount ? parseInt(item.statistics.viewCount, 10) : undefined,
  likeCount: item.statistics?.likeCount ? parseInt(item.statistics.likeCount, 10) : undefined,
  transcript: transcript?.fullText,
  transcriptSegments: transcript?.segments as YouTubeVideo['transcriptSegments'],
  transcriptFetched: true,
});

/**
 * Stream videos with transcripts into a DXOS queue.
 */
const streamVideosToQueue = Effect.fn(function* (
  uploadsPlaylistId: string,
  channelTitle: string,
  queue: Queue<YouTubeVideo>,
  existingVideoIds: Set<string>,
  restricted: boolean,
  includeTranscripts: boolean,
) {
  const count = yield* Function.pipe(
    fetchPlaylistVideos(uploadsPlaylistId, restricted ? STREAMING_CONFIG.restrictedMax : undefined),
    Stream.filter((videoId) => {
      const isDuplicate = existingVideoIds.has(videoId);
      if (isDuplicate) {
        log('skipping duplicate video', { videoId });
      }
      return !isDuplicate;
    }),
    restricted ? Stream.take(STREAMING_CONFIG.restrictedMax) : Function.identity,
    Stream.grouped(10),
    Stream.flatMap(
      (videoIdChunk) =>
        Effect.gen(function* () {
          const videoIds = Chunk.toArray(videoIdChunk);
          log('fetching video details', { count: videoIds.length });

          const response = yield* YouTube.getVideoDetails(videoIds);
          return response.items;
        }),
      { concurrency: 1 },
    ),
    Stream.flatMap((items) => Stream.fromIterable(items)),
    Stream.flatMap(
      (item) =>
        Effect.gen(function* () {
          let transcript: { segments: unknown[]; fullText: string } | undefined;

          if (includeTranscripts) {
            log('fetching transcript', { videoId: item.id });
            transcript = yield* fetchTranscript(item.id);
            if (transcript) {
              log('transcript fetched', { videoId: item.id, length: transcript.fullText.length });
            } else {
              log('no transcript available', { videoId: item.id });
            }
          }

          return mapVideo(item, transcript);
        }),
      {
        concurrency: STREAMING_CONFIG.transcriptFetchConcurrency,
        bufferSize: STREAMING_CONFIG.bufferSize,
      },
    ),
    Stream.filter(Predicate.isNotNullable),
    Stream.grouped(STREAMING_CONFIG.queueBatchSize),
    Stream.mapEffect((batch) =>
      Effect.gen(function* () {
        const videos = Chunk.toArray(batch);
        log('appending batch to queue', { count: videos.length });
        yield* Effect.tryPromise(() => queue.append(videos));
        return videos.length;
      }),
    ),
    Stream.runFold(0, (acc, count) => acc + count),
  );

  return count;
});

export default defineFunction({
  key: 'dxos.org/function/youtube/sync',
  name: 'Sync YouTube Channel',
  description: 'Sync videos from a YouTube channel to the queue.',
  inputSchema: Schema.Struct({
    channel: Type.Ref(Channel.YouTubeChannel).annotations({
      description: 'Reference to the YouTube channel to sync videos from.',
    }),
    restrictedMode: Schema.Boolean.pipe(
      Schema.annotations({
        description:
          'Use restricted mode to limit to max 20 videos. Reduces API calls. Useful for testing or quick syncs.',
      }),
      Schema.optional,
    ),
    includeTranscripts: Schema.Boolean.pipe(
      Schema.annotations({
        description:
          'Whether to fetch video transcripts. Transcripts are fetched using public YouTube transcript API and do not require authentication.',
      }),
      Schema.optional,
    ),
  }),
  outputSchema: Schema.Struct({
    newVideos: Schema.Number,
    channelTitle: Schema.optional(Schema.String),
  }),
  types: [Channel.YouTubeChannel],
  services: [Database.Service, QueueService],
  handler: ({ data: { channel: channelRef, restrictedMode = false, includeTranscripts = true } }) =>
    Effect.gen(function* () {
      log('syncing youtube channel', { channel: channelRef.dxn.toString(), restrictedMode, includeTranscripts });
      const channel = yield* Database.load(channelRef);

      const channelUrl = channel.channelUrl ?? channel.channelId;
      if (!channelUrl) {
        return yield* Effect.fail(new Error('No channel URL or ID configured'));
      }

      const channelInfo = extractChannelInfo(channelUrl);
      log('extracted channel info', channelInfo);

      const { channelId, channelTitle, uploadsPlaylistId } = yield* getUploadsPlaylistId(channelInfo);
      log('found channel', { channelId, channelTitle, uploadsPlaylistId });

      Obj.change(channel, (channelObj) => {
        channelObj.channelId = channelId;
        if (!channelObj.name) {
          channelObj.name = channelTitle;
        }
      });

      const queue = yield* QueueService.getQueue<YouTubeVideo>(channel.queue.dxn);

      const existingVideos = yield* Effect.tryPromise(() =>
        queue.query(Query.select(Filter.schema(Schema.Struct({ videoId: Schema.String })))).run(),
      );
      const existingVideoIds = new Set(existingVideos.map((video) => video.videoId));
      log('existing videos', { count: existingVideoIds.size });

      const newVideosCount = yield* streamVideosToQueue(
        uploadsPlaylistId,
        channelTitle,
        queue,
        existingVideoIds,
        restrictedMode,
        includeTranscripts,
      );

      Obj.change(channel, (channelObj) => {
        channelObj.lastSyncedAt = new Date().toISOString();
      });

      log('sync complete', { newVideos: newVideosCount, channelTitle });
      return {
        newVideos: newVideosCount,
        channelTitle,
      };
    }).pipe(
      Effect.provide(Layer.mergeAll(FetchHttpClient.layer, GoogleCredentials.fromChannelRef(channelRef))),
    ),
});
