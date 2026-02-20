//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Type } from '@dxos/echo';

/**
 * Transcript segment from a YouTube video.
 */
export const TranscriptSegment = Schema.Struct({
  /** Transcript text. */
  text: Schema.String,
  /** Start time in seconds. */
  offset: Schema.Number,
  /** Duration in seconds. */
  duration: Schema.Number,
});

export type TranscriptSegment = Schema.Schema.Type<typeof TranscriptSegment>;

/**
 * YouTubeVideo schema representing a video from a YouTube channel.
 */
export const YouTubeVideo = Schema.Struct({
  /** Video title. */
  title: Schema.String,
  /** YouTube video ID. */
  videoId: Schema.String,
  /** Video description. */
  description: Schema.optional(Schema.String),
  /** Video URL. */
  url: Schema.String,
  /** Thumbnail URL. */
  thumbnailUrl: Schema.optional(Schema.String),
  /** Channel name. */
  channelTitle: Schema.optional(Schema.String),
  /** Published date as ISO string. */
  publishedAt: Schema.String,
  /** Video duration in ISO 8601 format (e.g., PT1H30M15S). */
  duration: Schema.optional(Schema.String),
  /** View count. */
  viewCount: Schema.optional(Schema.Number),
  /** Like count. */
  likeCount: Schema.optional(Schema.Number),
  /** Full transcript text. */
  transcript: Schema.optional(Schema.String),
  /** Transcript segments with timestamps. */
  transcriptSegments: Schema.optional(Schema.Array(TranscriptSegment)),
  /** Whether transcript fetching was attempted. */
  transcriptFetched: Schema.optional(Schema.Boolean),
}).pipe(
  Type.object({
    typename: 'dxos.org/type/YouTubeVideo',
    version: '0.1.0',
  }),
);

export interface YouTubeVideo extends Schema.Schema.Type<typeof YouTubeVideo> {}
