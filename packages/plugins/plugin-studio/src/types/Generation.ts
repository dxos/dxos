//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

/**
 * Provenance recorded on a generated {@link Variant} (inline, not an ECHO object). Absent on
 * uploaded/external variants. `parameters` carries provider-specific knobs (resolution, style, …)
 * so new providers add data without a schema change.
 */
export const Generation = Schema.Struct({
  provider: Schema.String,
  model: Schema.optional(Schema.String),
  /** The resolved/magic prompt actually used by the provider. */
  prompt: Schema.optional(Schema.String),
  parameters: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
  seed: Schema.optional(Schema.Number),
  createdAt: Schema.optional(Schema.String),
  requestId: Schema.optional(Schema.String),
});
export interface Generation extends Schema.Schema.Type<typeof Generation> {}
