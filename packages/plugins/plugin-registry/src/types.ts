//
// Copyright 2025 DXOS.org
//

import { type Atom } from '@effect-atom/atom-react';
import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';

import { meta } from './meta';

export const RegistrySettingsSchema = Schema.mutable(
  Schema.Struct({
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
  }),
);

export type RegistrySettings = Schema.Schema.Type<typeof RegistrySettingsSchema>;

/**
 * Per-plugin capabilities exposed by `@dxos/plugin-registry`.
 */
export namespace RegistryCapabilities {
  export const Settings = Capability.make<Atom.Writable<RegistrySettings>>(`${meta.id}.capability.settings`);
}

export const RegistryTagType = Schema.Literal(
  'new',
  'beta',
  'labs',
  'popular',
  'featured',
  'experimental',
  'registry',
  'local',
);

export type RegistryTagType = Schema.Schema.Type<typeof RegistryTagType>;
