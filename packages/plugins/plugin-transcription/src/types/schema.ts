//
// Copyright 2025 DXOS.org
//

import { Expando, Ref, S, TypedObject } from '@dxos/echo-schema';

/**
 * Root transcript object created when the user starts a transcription.
 */
export const TranscriptSchema = S.Struct({
  name: S.String,

  // TODO(burdon): Use Date or string?
  started: S.optional(S.String),
  ended: S.optional(S.String),

  /**
   * Queue containing TranscriptBlock objects.
   */
  // TODO(wittjosiah): Should be a ref to a queue.
  queue: Ref(Expando),
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
  started: S.optional(S.String),
});

export type TranscriptHeader = S.Schema.Type<typeof TranscriptHeader>;
