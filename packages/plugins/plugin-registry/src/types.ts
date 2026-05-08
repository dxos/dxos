//
// Copyright 2025 DXOS.org
//

import { type Atom } from '@effect-atom/atom-react';
import * as Schema from 'effect/Schema';

import { Capability, type RegistryPlugin, type RegistryPluginProvider } from '@dxos/app-framework';

import { meta } from '#meta';

export type RegistryPluginsState = {
  entries: readonly RegistryPlugin[];
  loading: boolean;
  error: Error | null;
};

export namespace RegistryCapabilities {
  export const State = Capability.make<Atom.Atom<RegistryPluginsState>>(`${meta.id}.capability.state`);
  export const Provider = Capability.make<RegistryPluginProvider>(`${meta.id}.capability.provider`);
}

export const RegistrySettingsSchema = Schema.mutable(
  Schema.Struct({
    experimental: Schema.optional(Schema.Boolean),
  }),
);

export type RegistrySettings = Schema.Schema.Type<typeof RegistrySettingsSchema>;

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
