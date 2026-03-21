//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation, Obj, Type } from '@dxos/echo';

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
  description: Schema.String.pipe(Schema.optional),
  /** Video URL. */
  url: Schema.String,
  /** Thumbnail URL. */
  thumbnailUrl: Schema.String.pipe(Schema.optional),
  /** Channel name. */
  channelTitle: Schema.String.pipe(Schema.optional),
  /** Published date as ISO string. */
  publishedAt: Schema.String,
  /** Video duration in ISO 8601 format (e.g., PT1H30M15S). */
  duration: Schema.String.pipe(Schema.optional),
  /** View count. */
  viewCount: Schema.Number.pipe(Schema.optional),
  /** Like count. */
  likeCount: Schema.Number.pipe(Schema.optional),
  /** Full transcript text. */
  transcript: Schema.String.pipe(Schema.optional),
  /** Transcript segments with timestamps. */
  transcriptSegments: Schema.Array(TranscriptSegment).pipe(Schema.optional),
  /** True when transcript text was successfully loaded; false when disabled or none available. */
  transcriptFetched: Schema.Boolean.pipe(Schema.optional),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.youtube-video',
    version: '0.1.0',
  }),
  Annotation.IconAnnotation.set({
    icon: 'ph--play--regular',
    hue: 'red',
  }),
);

export interface YouTubeVideo extends Schema.Schema.Type<typeof YouTubeVideo> {}

/** Checks if a value is a YouTubeVideo object. */
export const instanceOf = (value: unknown): value is YouTubeVideo => Obj.instanceOf(YouTubeVideo, value);
