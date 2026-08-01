//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

/**
 * Provenance recorded on a generated {@link Variant} (inline, not an ECHO object). Absent on
 * uploaded/external variants. The request knobs live on {@link Variant.config}; this records what
 * the provider actually did (resolved prompt, seed, request id, …).
 */
export const Generation = Schema.Struct({
  provider: Schema.String,
  model: Schema.optional(Schema.String),
  /** The resolved/magic prompt actually used by the provider. */
  prompt: Schema.optional(Schema.String),
  seed: Schema.optional(Schema.Number),
  createdAt: Schema.optional(Schema.String),
  requestId: Schema.optional(Schema.String),
});
export interface Generation extends Schema.Schema.Type<typeof Generation> {}
