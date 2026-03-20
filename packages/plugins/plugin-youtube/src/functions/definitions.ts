//
// Copyright 2024 DXOS.org
//

import { Operation } from '@dxos/operation';
import * as Schema from 'effect/Schema';

import { Database, Feed, Ref } from '@dxos/echo';
import { CredentialsService } from '@dxos/functions';

import * as Channel from '../types/Channel';
import * as Video from '../types/Video';

export const Sync = Operation.make({
  meta: {
    key: 'dxos.org/function/youtube/sync',
    name: 'Sync YouTube Channel',
    description: 'Sync videos from a YouTube channel to the feed.',
  },
  input: Schema.Struct({
    channel: Ref.Ref(Channel.YouTubeChannel).annotations({
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
          'Whether to fetch transcripts: Data API when your account can manage the video, otherwise watch-page captions (browser uses a public CORS proxy for YouTube fetches).',
      }),
      Schema.optional,
    ),
  }),
  output: Schema.Struct({
    newVideos: Schema.Number,
    channelTitle: Schema.String.pipe(Schema.optional),
  }),
  types: [Channel.YouTubeChannel, Video.YouTubeVideo],
  services: [Database.Service, Feed.Service, CredentialsService],
});

export const ClearSyncedVideos = Operation.make({
  meta: {
    key: 'dxos.org/function/youtube/clear-synced-videos',
    name: 'Clear Synced YouTube Videos',
    description: 'Remove all synced videos from the channel by replacing its feed with a new empty feed.',
  },
  input: Schema.Struct({
    channel: Ref.Ref(Channel.YouTubeChannel).annotations({
      description: 'Reference to the YouTube channel whose synced videos should be cleared.',
    }),
  }),
  output: Schema.Struct({
    removedVideos: Schema.Number,
  }),
  types: [Channel.YouTubeChannel, Video.YouTubeVideo],
  services: [Database.Service, Feed.Service],
});
