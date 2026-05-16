//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

/**
 * Track metadata. Owns the instrument/patch assignment and visual identity;
 * Sequences reference the track they belong to via trackId.
 */
export const Track = Schema.Struct({
  /** Stable identifier referenced by Sequence.trackId. */
  id: Schema.String,
  name: Schema.String,
  /** Hex color string for UI tinting (e.g. '#3b82f6'). */
  color: Schema.optional(Schema.String),
  /** Opaque patch identifier (e.g. 'sf2:piano'). */
  instrument: Schema.optional(Schema.String),
  /** Default visible pitch floor; defaults to 36 (C2). */
  minPitch: Schema.optional(Schema.Number),
  /** Default visible pitch ceiling; defaults to 84 (C6). */
  maxPitch: Schema.optional(Schema.Number),
  muted: Schema.optional(Schema.Boolean),
}).pipe(Schema.mutable);

export interface Track extends Schema.Schema.Type<typeof Track> {}
