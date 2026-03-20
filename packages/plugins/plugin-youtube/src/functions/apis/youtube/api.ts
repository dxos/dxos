//
// Copyright 2024 DXOS.org
//

import * as HttpClient from '@effect/platform/HttpClient';
import * as HttpClientRequest from '@effect/platform/HttpClientRequest';
import * as Effect from 'effect/Effect';
import type * as ParseResult from 'effect/ParseResult';
import * as Schedule from 'effect/Schedule';
import * as Schema from 'effect/Schema';

import { withAuthorization } from '@dxos/functions';
import { log } from '@dxos/log';

import { GoogleCredentials } from '../../services/google-credentials';

import {
  ChannelsResponse,
  ErrorResponse,
  PlaylistItemsResponse,
  SearchResponse,
  VideosResponse,
  YouTubeError,
} from './types';

const API_URL = 'https://www.googleapis.com/youtube/v3';

/**
 * Creates a URL from path segments and query parameters.
 */
const createUrl = (parts: (string | undefined)[], params?: Record<string, unknown>): URL => {
  const url = new URL(parts.filter(Boolean).join('/'));
  if (params) {
    Object.entries(params)
      .filter(([_, value]) => value != null)
      .forEach(([key, value]) => url.searchParams.set(key, String(value)));
  }
  return url;
};

/**
 * Decode response and handle YouTube API errors.
 */
const decodeAndHandleErrors =
  <S extends Schema.Schema.Any>(schema: S) =>
  (
    data: unknown,
  ): Effect.Effect<Schema.Schema.Type<S>, YouTubeError | ParseResult.ParseError, Schema.Schema.Context<S>> =>
    Schema.decodeUnknown(Schema.Union(schema, ErrorResponse))(data).pipe(
      Effect.flatMap((response) => {
        if ('error' in response) {
          return Effect.fail(YouTubeError.fromErrorResponse(response));
        } else {
          return Effect.succeed(response);
        }
      }),
    );

/**
 * Makes an authenticated HTTP request to a YouTube API endpoint.
 */
const makeYouTubeApiRequest = Effect.fn('makeYouTubeApiRequest')(function* (url: string) {
  const token = yield* GoogleCredentials.get();

  const httpClient = yield* HttpClient.HttpClient.pipe(Effect.map(withAuthorization(token, 'Bearer')));
  const httpClientWithTracerDisabled = httpClient.pipe(HttpClient.withTracerDisabledWhen(() => true));

  const request = HttpClientRequest.get(url);

  const response = yield* request.pipe(
    HttpClientRequest.setHeader('accept', 'application/json'),
    httpClientWithTracerDisabled.execute,
    Effect.flatMap((res) => res.json),
    Effect.timeout('10 seconds'),
    Effect.retry(Schedule.exponential(1_000).pipe(Schedule.compose(Schedule.recurs(3)))),
    Effect.scoped,
    Effect.withSpan('YouTubeApiRequest'),
  );

  if ((response as Record<string, unknown>).error) {
    log.catch((response as Record<string, unknown>).error);
  }

  return response;
});

/**
 * Get channel details by channel ID.
 * https://developers.google.com/youtube/v3/docs/channels/list
 */
export const getChannel = Effect.fn(function* (channelId: string) {
  const url = createUrl([API_URL, 'channels'], {
    part: 'snippet,contentDetails',
    id: channelId,
  }).toString();
  return yield* makeYouTubeApiRequest(url).pipe(Effect.flatMap(decodeAndHandleErrors(ChannelsResponse)));
});

/**
 * Get channel by username/handle.
 * https://developers.google.com/youtube/v3/docs/channels/list
 */
export const getChannelByHandle = Effect.fn(function* (handle: string) {
  const url = createUrl([API_URL, 'channels'], {
    part: 'snippet,contentDetails',
    forHandle: handle.startsWith('@') ? handle.slice(1) : handle,
  }).toString();
  return yield* makeYouTubeApiRequest(url).pipe(Effect.flatMap(decodeAndHandleErrors(ChannelsResponse)));
});

/**
 * Search for channels by query.
 * https://developers.google.com/youtube/v3/docs/search/list
 */
export const searchChannels = Effect.fn(function* (query: string, maxResults = 10) {
  const url = createUrl([API_URL, 'search'], {
    part: 'snippet',
    type: 'channel',
    q: query,
    maxResults,
  }).toString();
  return yield* makeYouTubeApiRequest(url).pipe(Effect.flatMap(decodeAndHandleErrors(SearchResponse)));
});

/**
 * List videos from a playlist (used to get uploads from a channel's uploads playlist).
 * https://developers.google.com/youtube/v3/docs/playlistItems/list
 */
export const listPlaylistItems = Effect.fn(function* (playlistId: string, maxResults = 50, pageToken?: string) {
  const url = createUrl([API_URL, 'playlistItems'], {
    part: 'snippet,contentDetails',
    playlistId,
    maxResults,
    pageToken,
  }).toString();
  return yield* makeYouTubeApiRequest(url).pipe(Effect.flatMap(decodeAndHandleErrors(PlaylistItemsResponse)));
});

/**
 * Get detailed video information including statistics and duration.
 * https://developers.google.com/youtube/v3/docs/videos/list
 */
export const getVideoDetails = Effect.fn(function* (videoIds: string[]) {
  const url = createUrl([API_URL, 'videos'], {
    part: 'snippet,contentDetails,statistics',
    id: videoIds.join(','),
  }).toString();
  return yield* makeYouTubeApiRequest(url).pipe(Effect.flatMap(decodeAndHandleErrors(VideosResponse)));
});
