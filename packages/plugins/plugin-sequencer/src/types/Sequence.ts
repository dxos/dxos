//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Note } from './Note';

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
  notes: Schema.mutable(Schema.Array(Note)),
}).pipe(Schema.mutable);

export interface Sequence extends Schema.Schema.Type<typeof Sequence> {}
