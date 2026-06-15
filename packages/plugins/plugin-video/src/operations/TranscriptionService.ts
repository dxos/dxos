//
// Copyright 2025 DXOS.org
//

import * as S from 'effect/Schema';

/**
 * Schema for the /transcript and /languages endpoint query parameters.
 * Accepts a raw video id or any common YouTube URL form.
 */
export const TranscriptRequest = S.Struct({
  url: S.String.pipe(S.nonEmptyString()),
  lang: S.optional(S.String.pipe(S.nonEmptyString())),
  // Response format: `json` (default) returns the full payload; `markdown` returns a raw document.
  format: S.optional(S.Literal('json', 'markdown', 'md', 'text')),
});

export interface TranscriptRequest extends S.Schema.Type<typeof TranscriptRequest> {}

/**
 * Schema for a single timed transcript segment.
 */
export const Segment = S.Struct({
  text: S.String,
  offset: S.Number,
  duration: S.Number,
});

export interface Segment extends S.Schema.Type<typeof Segment> {}

/**
 * Schema for the /transcript endpoint response.
 */
export const TranscriptResponse = S.Struct({
  success: S.Boolean,
  result: S.Struct({
    videoId: S.String,
    title: S.String,
    languageCode: S.String,
    generated: S.Boolean,
    text: S.String,
    markdown: S.String,
    segmentCount: S.Number,
    segments: S.Array(Segment),
  }),
});

export interface TranscriptResponse extends S.Schema.Type<typeof TranscriptResponse> {}

/**
 * Schema for an available caption track.
 */
export const Language = S.Struct({
  languageCode: S.String,
  languageName: S.String,
  generated: S.Boolean,
});

export interface Language extends S.Schema.Type<typeof Language> {}

/**
 * Schema for the /languages endpoint response.
 */
export const LanguagesResponse = S.Struct({
  success: S.Boolean,
  result: S.Struct({
    videoId: S.String,
    languages: S.Array(Language),
  }),
});

export interface LanguagesResponse extends S.Schema.Type<typeof LanguagesResponse> {}

/**
 * Schema for the /health endpoint response.
 */
export const HealthResponse = S.Struct({
  status: S.Literal('ok'),
});

export interface HealthResponse extends S.Schema.Type<typeof HealthResponse> {}
