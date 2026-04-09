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
import * as Stream from 'effect/Stream';

import { Database, Feed, Filter, Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { Operation } from '@dxos/operation';

import { Channel, Video } from '../types';
import { YouTube } from './apis';
import { Sync } from './definitions';
import { GoogleCredentials } from './services/google-credentials';
import { fetchTranscript } from './transcript';

const handler: Operation.WithHandler<typeof Sync> = Sync.pipe(
  Operation.withHandler(({ channel: channelRef, restrictedMode = false, includeTranscripts = true }) =>
    Effect.gen(function* () {
      log('syncing youtube channel', { channel: channelRef.dxn.toString(), restrictedMode, includeTranscripts });
      const channel = yield* Database.load(channelRef);

      const channelUrl =
        (channel as Channel.YouTubeChannel).channelUrl ?? (channel as Channel.YouTubeChannel).channelId;
      if (!channelUrl) {
        return yield* Effect.fail(new Error('No channel URL or ID configured'));
      }

      const channelInfo = extractChannelInfo(channelUrl);
      log('extracted channel info', channelInfo);

      const { channelId, channelTitle, uploadsPlaylistId } = yield* getUploadsPlaylistId(channelInfo);
      log('found channel', { channelId, channelTitle, uploadsPlaylistId });

      Obj.change(channel as Channel.YouTubeChannel, (channelObj) => {
        channelObj.channelId = channelId;
        if (!channelObj.name) {
          channelObj.name = channelTitle;
        }
      });

      // Get the feed and query for existing videos.
      const feed = yield* Database.load((channel as Channel.YouTubeChannel).feed as Ref.Ref<Feed.Feed>);
      const existingVideos = yield* Feed.runQuery(feed, Filter.type(Video.YouTubeVideo));
      const existingVideoIds = new Set(existingVideos.map((video: Video.YouTubeVideo) => video.videoId));
      log('existing videos', { count: existingVideoIds.size });

      const newVideosCount = yield* streamVideosToFeed(
        uploadsPlaylistId,
        feed,
        existingVideoIds,
        restrictedMode,
        includeTranscripts,
      );

      Obj.change(channel as Channel.YouTubeChannel, (channelObj) => {
        channelObj.lastSyncedAt = new Date().toISOString();
      });

      log('sync complete', { newVideos: newVideosCount, channelTitle });
      return {
        newVideos: newVideosCount,
        channelTitle,
      };
    }).pipe(Effect.provide(Layer.mergeAll(FetchHttpClient.layer, GoogleCredentials.fromChannelRef(channelRef)))),
  ),
);

const STREAMING_CONFIG = {
  /** Videos per page from YouTube API. */
  maxResults: 50,
  /** Parallel transcript fetches. */
  transcriptFetchConcurrency: 3,
  /** In-flight video buffer. */
  bufferSize: 10,
  /** Videos per feed append. */
  feedBatchSize: 10,
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

type TranscriptData = { segments: Video.TranscriptSegment[]; fullText: string };

/**
 * Maps YouTube API video item to YouTubeVideo data.
 */
const mapVideoData = (
  item: YouTube.VideoItem,
  transcript: TranscriptData | undefined,
  includeTranscripts: boolean,
): Omit<Video.YouTubeVideo, 'id' | '~@dxos/echo/Kind'> => {
  const hasTranscript = Boolean(transcript?.fullText?.trim());
  return {
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
    transcript: transcript && hasTranscript ? transcript.fullText : undefined,
    transcriptSegments: transcript && hasTranscript ? transcript.segments : undefined,
    transcriptFetched: includeTranscripts ? hasTranscript : false,
  };
};

/**
 * Stream videos with transcripts into a DXOS feed.
 */
const streamVideosToFeed = Effect.fn(function* (
  uploadsPlaylistId: string,
  feed: Feed.Feed,
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
          let transcript: TranscriptData | undefined;

          if (includeTranscripts) {
            log('fetching transcript', { videoId: item.id });
            const result = yield* fetchTranscript(item.id);
            if (result) {
              transcript = result;
              log('transcript fetched', { videoId: item.id, length: transcript.fullText.length });
            } else {
              log('no transcript available', { videoId: item.id });
            }
          }

          return mapVideoData(item, transcript, includeTranscripts);
        }),
      {
        concurrency: STREAMING_CONFIG.transcriptFetchConcurrency,
        bufferSize: STREAMING_CONFIG.bufferSize,
      },
    ),
    Stream.filter(Predicate.isNotNullable),
    Stream.grouped(STREAMING_CONFIG.feedBatchSize),
    Stream.mapEffect((batch) =>
      Effect.gen(function* () {
        const videos = Chunk.toArray(batch);
        log('appending batch to feed', { count: videos.length });
        const videoObjects = videos.map((video) => Obj.make(Video.YouTubeVideo, video));
        yield* Feed.append(feed, videoObjects);
        return videos.length;
      }),
    ),
    Stream.runFold(0, (acc, batchCount) => acc + batchCount),
  );

  return count;
});

export default handler;
