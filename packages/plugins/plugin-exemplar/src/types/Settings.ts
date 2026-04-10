//
// Copyright 2025 DXOS.org
//

// Settings schema for plugin-level configuration.
// Settings are persisted to local KVS (key-value store) and appear in the
// global settings panel when contributed via `AppCapabilities.Settings`.

import * as Schema from 'effect/Schema';

// `Schema.mutable` is required for settings schemas because the settings atom
// is a writable store that gets mutated when users toggle settings in the UI.
export const Settings = Schema.mutable(
  Schema.Struct({
    showStatusIndicator: Schema.optional(Schema.Boolean),
  }),
);

export type Settings = Schema.Schema.Type<typeof Settings>;
