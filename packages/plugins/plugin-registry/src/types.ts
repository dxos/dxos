//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';
import type * as Atom from 'effect/unstable/reactivity/Atom';

import * as Capability from '@dxos/app-framework/Capability';
import { DXN } from '@dxos/keys';

import { meta } from '#meta';

// A surface id is data, not UI: the app-graph builder reaches it from the headless barrel, so it
// cannot live in the dialog component's module without dragging React in behind it.
export const LOAD_PLUGIN_DIALOG = DXN.make(`${meta.profile.key}.loadPluginDialog`);

export const RegistrySettingsSchema = Schema.Struct({
  experimental: Schema.optional(Schema.Boolean),
  /**
   * Manifest URL for a plugin served by a local Vite dev server. The
   * registry settings panel pre-fills this with `localhost:3967`; authors
   * iterating on a different port can edit it.
   */
  devPluginUrl: Schema.optional(Schema.String),
  /**
   * When true, the registry plugin attempts to load `devPluginUrl` on every
   * app boot. Failures (dev server offline, manifest 404) are logged and
   * the flag stays on so the next boot retries — the user explicitly turns
   * it off when they're done iterating.
   */
  devPluginEnabled: Schema.optional(Schema.Boolean),
}).mapFields(Struct.map(Schema.mutableKey));

export type RegistrySettings = Schema.Schema.Type<typeof RegistrySettingsSchema>;

/**
 * Per-plugin capabilities exposed by `@dxos/plugin-registry`.
 */
export namespace RegistryCapabilities {
  export const Settings = Capability.makeSingleton<Atom.Writable<RegistrySettings>>()(
    `${meta.profile.key}.capability.settings`,
  );
}

export const RegistryTagType = Schema.Literals([
  'new',
  'beta',
  'alpha',
  'labs',
  'popular',
  'featured',
  'experimental',
  'registry',
  'local',
]);

export type RegistryTagType = Schema.Schema.Type<typeof RegistryTagType>;
