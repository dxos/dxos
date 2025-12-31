//
// Copyright 2025 DXOS.org
//

import type * as Schema from 'effect/Schema';

import { type AnyIntent, Capability, type Label } from '@dxos/app-framework';
import { type Space } from '@dxos/client/echo';
import { type Database } from '@dxos/echo';
import { type Collection } from '@dxos/schema';
import { type DeepReadonly, type Position } from '@dxos/util';

import { meta } from '../meta';

import { type PluginState } from './types';

export namespace SpaceCapabilities {
  export const State = Capability.make<DeepReadonly<PluginState>>(`${meta.id}/capability/state`);
  export const MutableState = Capability.make<PluginState>(`${meta.id}/capability/state`);

  export type SettingsSection = { id: string; label: Label; position?: Position };
  export const SettingsSection = Capability.make<SettingsSection>(`${meta.id}/capability/settings-section`);

  export type OnCreateSpace = (params: {
    space: Space;
    isDefault: boolean;
    rootCollection: Collection.Collection;
  }) => AnyIntent;
  export const OnCreateSpace = Capability.make<OnCreateSpace>(`${meta.id}/capability/on-space-created`);

  export type OnSchemaAdded = (params: {
    db: Database.Database;
    schema: Schema.Schema.AnyNoContext;
    // TODO(wittjosiah): This is leaky.
    show?: boolean;
  }) => AnyIntent;
  export const OnSchemaAdded = Capability.make<OnSchemaAdded>(`${meta.id}/capability/on-schema-added`);

  // TODO(wittjosiah): Replace with migrations, this is not a sustainable solution.
  export type HandleRepair = (params: { space: Space; isDefault: boolean }) => Promise<void>;
  export const Repair = Capability.make<HandleRepair>(`${meta.id}/capability/repair`);
}
