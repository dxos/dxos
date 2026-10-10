//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

import { Note } from './Note.ts';

/**
 * Ordered collection of notes associated with a single Track. Has a fixed length (in beats);
 * notes whose start lies outside that range are clipped during render and playback.
 */
export const Sequence = Schema.Struct({
  /** Stable identifier for selection. */
  id: Schema.String,
  /** Track.id this sequence belongs to. */
  trackId: Schema.String,
  name: Schema.optional(Schema.String),
  /** Length in beats. */
  length: Schema.Number,
  /** Overrides the score's time signature for this sequence (e.g. '3/4'). */
  timeSignature: Schema.optional(Schema.String),
  /** Overrides the score's key for this sequence (e.g. 'D minor'). */
  key: Schema.optional(Schema.String),
  notes: Schema.mutable(Schema.Array(Note)),
}).mapFields(Struct.map(Schema.mutableKey));

export interface Sequence extends Schema.Schema.Type<typeof Sequence> {}
