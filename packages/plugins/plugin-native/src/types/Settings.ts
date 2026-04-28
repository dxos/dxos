//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

/**
 * Default global shortcut used to toggle the spotlight panel.
 * Must match the Rust default in `src-tauri/src/spotlight/config.rs`.
 */
export const DEFAULT_SPOTLIGHT_SHORTCUT = 'Alt+Space';

export const Settings = Schema.mutable(
  Schema.Struct({
    spotlightShortcut: Schema.optional(Schema.String),
  }),
);

export interface Settings extends Schema.Schema.Type<typeof Settings> {}
