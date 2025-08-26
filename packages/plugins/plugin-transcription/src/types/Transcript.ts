//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { Queue } from '@dxos/client/echo';
import { type DXN, Obj, Ref, Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo-schema';

/**
 * Root transcript object created when the user starts a transcription.
 */
export const Transcript = Schema.Struct({
  // TODO(wittjosiah): Remove?
  // TODO(burdon): Use Date or string?
  started: Schema.optional(Schema.String),
  ended: Schema.optional(Schema.String),

  /**
   * Queue containing TranscriptBlock objects.
   */
  queue: Type.Ref(Queue),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Transcript',
    version: '0.1.0',
  }),
  LabelAnnotation.set(['name']),
);

export type Transcript = Schema.Schema.Type<typeof Transcript>;

// TODO(burdon): Do these need to be kept in sync with EDGE?

/**
 * First message in queue.
 * Contains metadata for the recording and transcript.
 */
const TranscriptHeader = Schema.Struct({
  started: Schema.optional(Schema.String),
});

export type TranscriptHeader = Schema.Schema.Type<typeof TranscriptHeader>;

export const makeTranscript = (queueDxn: DXN) => Obj.make(Transcript, { queue: Ref.fromDXN(queueDxn) });
