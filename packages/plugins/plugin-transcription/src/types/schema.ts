//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { Expando, Ref, TypedObject } from '@dxos/echo-schema';

/**
 * Root transcript object created when the user starts a transcription.
 */
export const TranscriptSchema = Schema.Struct({
  name: Schema.String,

  // TODO(burdon): Use Date or string?
  started: Schema.optional(Schema.String),
  ended: Schema.optional(Schema.String),

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
const TranscriptHeader = Schema.Struct({
  started: Schema.optional(Schema.String),
});

export type TranscriptHeader = Schema.Schema.Type<typeof TranscriptHeader>;
