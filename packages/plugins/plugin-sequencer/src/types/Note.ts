//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

/**
 * A single note in a Sequence. Time fields are in beats relative to the start of the
 * sequence; sub-beat values are valid (e.g. 0.25 = sixteenth note at 4/4).
 */
export const Note = Schema.Struct({
  /** MIDI pitch number (0..127); 60 = middle C. */
  pitch: Schema.Number,
  /** Start time in beats from the start of the sequence. */
  startTime: Schema.Number,
  /** Duration in beats. */
  duration: Schema.Number,
  /** Velocity 0.0..1.0; defaults to 0.8. */
  velocity: Schema.optional(Schema.Number),
}).pipe(Schema.mutable);

export interface Note extends Schema.Schema.Type<typeof Note> {}
