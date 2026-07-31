//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

/**
 * Fact-analysis settings. Left unset, analysis uses the default edge model; a story or a
 * local-only setup overrides these to target a local provider (e.g. Ollama).
 */
export const Settings = Schema.Struct({
  /** Model id passed to the analysis pipeline (falls back to the default edge model when unset). */
  model: Schema.optional(
    Schema.String.annotations({
      title: 'Analysis model',
      description: 'Model id used to extract facts during mailbox analysis.',
    }),
  ),
  /** Provider id for the analysis model (e.g. `ollama`); paired with `model`. */
  provider: Schema.optional(
    Schema.String.annotations({
      title: 'Analysis provider',
      description: 'Provider backing the analysis model. Leave unset to use the default edge provider.',
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
