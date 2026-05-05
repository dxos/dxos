//
// Copyright 2025 DXOS.org
//

import { type Atom } from '@effect-atom/atom-react';
import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { type PluginEntry } from '@dxos/protocols';

import { meta } from '#meta';

export type CommunityPluginsState = {
  entries: readonly PluginEntry[];
  loading: boolean;
  error: Error | null;
};

export namespace RegistryCapabilities {
  export const State = Capability.make<Atom.Atom<CommunityPluginsState>>(`${meta.id}.capability.state`);
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
  'community',
  'local',
);

export type RegistryTagType = Schema.Schema.Type<typeof RegistryTagType>;
