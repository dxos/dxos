//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

/**
 * Fact-enrichment settings. Left unset, enrichment uses the default edge model; a story or a
 * local-only setup overrides these to target a local provider (e.g. Ollama).
 */
export const Settings = Schema.Struct({
  /** Model id passed to the enrich pipeline (falls back to the default edge model when unset). */
  model: Schema.optional(
    Schema.String.annotations({
      title: 'Enrichment model',
      description: 'Model id used to extract facts during mailbox enrichment.',
    }),
  ),
  /** Provider id for the enrichment model (e.g. `ollama`); paired with `model`. */
  provider: Schema.optional(
    Schema.String.annotations({
      title: 'Enrichment provider',
      description: 'Provider backing the enrichment model. Leave unset to use the default edge provider.',
    }),
  ),
  /** Whether to require strict structured output (off for local models that fail structured output). */
  strict: Schema.optional(
    Schema.Boolean.annotations({
      title: 'Strict structured output',
      description: 'Require strict structured output. Turn off for local models (e.g. Ollama) that fail it.',
    }),
  ),
}).pipe(Schema.mutable);
export interface Settings extends Schema.Schema.Type<typeof Settings> {}
