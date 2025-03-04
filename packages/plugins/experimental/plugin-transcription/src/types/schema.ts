//
// Copyright 2025 DXOS.org
//

import { EchoObject, ObjectId, S, TypedObject } from '@dxos/echo-schema';

/**
 * Root transcript object created when the user starts a transcription.
 */
export const TranscriptSchema = S.Struct({
  name: S.String,

  // TODO(burdon): Use string for dates?
  started: S.optional(S.Date),
  ended: S.optional(S.Date),

  /**
   * Queue containing TranscriptBlock objects.
   */
  queue: S.optional(S.String),
});

export class TranscriptType extends TypedObject({
  typename: 'dxos.org/type/Transcript',
  version: '0.1.0',
})(TranscriptSchema.fields) {}

// TODO(burdon): Do these need to be kept in sync with EDGE?

/**
 * First message in queue.
 * Contains metadata for the recording and transcript.
 */
const TranscriptHeader = S.Struct({
  started: S.optional(S.Date),
});

export type TranscriptHeader = S.Schema.Type<typeof TranscriptHeader>;

/**
 * Transcription fragment.
 */
const TranscriptSegment = S.Struct({
  // TODO(burdon): TS from service is not Unix TS (x1000).
  started: S.Date,
  text: S.String,
});

export type TranscriptSegment = S.Schema.Type<typeof TranscriptSegment>;

/**
 * Transcription block (from single speaker).
 */
export const TranscriptBlock = S.Struct({
  id: ObjectId,
  author: S.optional(S.String), // TODO(burdon): DID?
  segments: S.Array(TranscriptSegment),
}).pipe(EchoObject('dxos.org/type/TranscriptBlock', '0.1.0'));

export type TranscriptBlock = S.Schema.Type<typeof TranscriptBlock>;
