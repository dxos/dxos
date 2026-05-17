//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Patch } from './Patch';

/**
 * Track metadata. Owns the instrument / patch assignment and visual identity;
 * Sequences reference the track they belong to via trackId.
 *
 * `patches` is an array of pitch-range-to-sound mappings. A simple melodic track
 * has one synth patch covering the full range; a drum track has one patch per
 * drum sound. See `Patch.ts` for the patch shapes.
 */
export const Track = Schema.Struct({
  /** Stable identifier referenced by Sequence.trackId. */
  id: Schema.String,
  name: Schema.String,
  /** Hex color string for UI tinting (e.g. '#3b82f6'). */
  color: Schema.optional(Schema.String),
  /** Opaque instrument identifier (e.g. 'drums', 'piano'); informational only. */
  instrument: Schema.optional(Schema.String),
  /** Default visible pitch floor; defaults to 36 (C2). */
  minPitch: Schema.optional(Schema.Number),
  /** Default visible pitch ceiling; defaults to 84 (C6). */
  maxPitch: Schema.optional(Schema.Number),
  muted: Schema.optional(Schema.Boolean),
  /** Sound patches mapping pitch ranges to synth / drum / sample generators. */
  patches: Schema.optional(Schema.mutable(Schema.Array(Patch))),
}).pipe(Schema.mutable);

export interface Track extends Schema.Schema.Type<typeof Track> {}
