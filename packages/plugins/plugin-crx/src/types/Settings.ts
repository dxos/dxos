//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

/**
 * User preferences that govern how Composer coordinates with the composer-crx
 * browser extension. All fields are optional; defaults are applied by
 * consumers when reading the atom.
 */
export const Settings = Schema.mutable(
  Schema.Struct({
    /**
     * Master toggle. When false, the bridge plugin ignores incoming clips.
     * Defaults to `true`.
     */
    enabled: Schema.optional(Schema.Boolean),

    /**
     * Navigate to the created object after a successful clip. Defaults to
     * `false` to avoid yanking focus during active work.
     */
    autoOpenAfterClip: Schema.optional(Schema.Boolean),
  }),
);

export interface Settings extends Schema.Schema.Type<typeof Settings> {}

/**
 * Default values applied when a field is absent. Kept separate from the
 * schema so `createKvsStore` can store only user-set values while consumers
 * (this plugin's components, and any downstream reader) see sensible
 * defaults.
 */
export const defaults: Required<Settings> = {
  enabled: true,
  autoOpenAfterClip: false,
};

export const withDefaults = (settings: Settings): Required<Settings> => ({
  ...defaults,
  ...settings,
});
