//
// Copyright 2025 DXOS.org
//

import type * as Schema from 'effect/Schema';

import { type AnyIntentChain, type Label, defineCapability } from '@dxos/app-framework';
import { type Space } from '@dxos/react-client/echo';
import { type DataType } from '@dxos/schema';
import { type DeepReadonly, type Position } from '@dxos/util';

import { meta } from '../meta';
import { type ObjectForm, type PluginState } from '../types';

export namespace SpaceCapabilities {
  export const State = defineCapability<DeepReadonly<PluginState>>(`${meta.id}/capability/state`);
  export const MutableState = defineCapability<PluginState>(`${meta.id}/capability/state`);

  export type SettingsSection = { id: string; label: Label; position?: Position };
  export const SettingsSection = defineCapability<SettingsSection>(`${meta.id}/capability/settings-section`);

  export type onCreateSpace = (params: { space: Space; rootCollection: DataType.Collection }) => AnyIntentChain;
  export const onCreateSpace = defineCapability<onCreateSpace>(`${meta.id}/capability/on-space-created`);

  export type OnSchemaAdded = (params: {
    space: Space;
    schema: Schema.Schema.AnyNoContext;
    // TODO(wittjosiah): This is leaky.
    show?: boolean;
  }) => AnyIntentChain;
  export const OnSchemaAdded = defineCapability<OnSchemaAdded>(`${meta.id}/capability/on-schema-added`);

  // TODO(burdon): Should this be view? Forms are UI concepts? (associated with a View/schema).
  export const ObjectForm = defineCapability<ObjectForm<any>>(`${meta.id}/capability/object-form`);
}
