//
// Copyright 2024 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import { describe, it } from '@effect/vitest';
import * as Config from 'effect/Config';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { CredentialsService } from '@dxos/functions';

import { YouTube } from './apis';
import { GoogleCredentials } from './services/google-credentials';
import { fetchTranscript } from './transcript';

const TestLayer = Layer.mergeAll(
  CredentialsService.layerConfig([
    {
      service: 'google.com',
      apiKey: Config.redacted('GOOGLE_ACCESS_TOKEN'),
    },
  ]),
  FetchHttpClient.layer,
  GoogleCredentials.default,
);

/**
 * To get a temporary access token:
 * 1. Go to Google OAuth Playground: https://developers.google.com/oauthplayground/
 * 2. Select YouTube Data API v3 (all scopes or readonly)
 * 3. Authorize and get an access token
 *
 * export GOOGLE_ACCESS_TOKEN="xxx"
 * pnpm vitest sync.test.ts
 */
describe.runIf(process.env.GOOGLE_ACCESS_TOKEN)('YouTube API', { timeout: 30_000 }, () => {
  it.effect(
    'get channel by handle',
    Effect.fnUntraced(function* ({ expect }) {
      const response = yield* YouTube.getChannelByHandle('Google');
      console.log(JSON.stringify(response, null, 2));
      expect(response.items.length).toBeGreaterThan(0);
      expect(response.items[0].snippet?.title).toBeDefined();
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'get channel uploads',
    Effect.fnUntraced(function* ({ expect }) {
      const channelResponse = yield* YouTube.getChannelByHandle('Google');
      const channel = channelResponse.items[0];
      expect(channel).toBeDefined();

      const uploadsPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads;
      expect(uploadsPlaylistId).toBeDefined();

      const playlistResponse = yield* YouTube.listPlaylistItems(uploadsPlaylistId!, 5);
      console.log('Playlist items:', JSON.stringify(playlistResponse.items.slice(0, 2), null, 2));
      expect(playlistResponse.items.length).toBeGreaterThan(0);
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'get video details',
    Effect.fnUntraced(function* ({ expect }) {
      const channelResponse = yield* YouTube.getChannelByHandle('TED');
      const channel = channelResponse.items[0];
      expect(channel).toBeDefined();

      const uploadsPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads;
      expect(uploadsPlaylistId).toBeDefined();

      const playlistResponse = yield* YouTube.listPlaylistItems(uploadsPlaylistId!, 3);
      const videoIds = playlistResponse.items
        .map((item) => item.snippet?.resourceId?.videoId)
        .filter((id): id is string => Boolean(id));

      const videosResponse = yield* YouTube.getVideoDetails(videoIds);
      console.log('Video details:', JSON.stringify(videosResponse.items[0], null, 2));
      expect(videosResponse.items.length).toBeGreaterThan(0);
      expect(videosResponse.items[0].contentDetails?.duration).toBeDefined();
    }, Effect.provide(TestLayer)),
  );
});

/**
 * Transcript fetching does not require Google API authentication.
 * It uses the youtube-transcript package which scrapes transcripts from YouTube.
 */
describe('YouTube Transcript', { timeout: 30_000 }, () => {
  it.effect(
    'fetch transcript for video',
    Effect.fnUntraced(function* ({ expect }) {
      const result = yield* fetchTranscript('dQw4w9WgXcQ');

      if (result) {
        console.log('Transcript segments:', result.segments.length);
        console.log('Full text preview:', result.fullText.slice(0, 200));
        expect(result.segments.length).toBeGreaterThan(0);
        expect(result.fullText.length).toBeGreaterThan(0);
      } else {
        console.log('No transcript available for this video');
      }
    }),
  );

  it.effect(
    'handles video without transcript gracefully',
    Effect.fnUntraced(function* ({ expect }) {
      const result = yield* fetchTranscript('nonexistent_video_id_12345');
      expect(result).toBeUndefined();
    }),
  );
});
