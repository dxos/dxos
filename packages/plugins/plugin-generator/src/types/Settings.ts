//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

/**
 * Per-provider settings (api key + future provider-specific knobs).
 * Each Generation picks its provider via `Generation.provider`; the article
 * looks up the matching entry here to source the api key.
 */
export const ProviderSettings = Schema.mutable(
  Schema.Struct({
    apiKey: Schema.optional(
      Schema.String.annotations({
        title: 'API key',
      }),
    ),
  }),
);
export interface ProviderSettings extends Schema.Schema.Type<typeof ProviderSettings> {}

/**
 * Plugin-level settings. `providers` is a map keyed by `provider.id` whose
 * values are `ProviderSettings` so each provider can grow its own settings
 * surface without changing the top-level schema. Provider ids match
 * `GenerationProvider.id` (currently `'heygen'`, `'gemini'`).
 */
export const Settings = Schema.mutable(
  Schema.Struct({
    providers: Schema.optional(
      Schema.mutable(
        Schema.Struct({
          heygen: Schema.optional(ProviderSettings.annotations({ title: 'HeyGen' })),
          gemini: Schema.optional(ProviderSettings.annotations({ title: 'Gemini (Veo)' })),
        }),
      ),
    ),
  }),
);

export interface Settings extends Schema.Schema.Type<typeof Settings> {}
