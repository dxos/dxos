//
// Copyright 2025 DXOS.org
//

import { defineCapability, type Label } from '@dxos/app-framework';
import { type Space } from '@dxos/react-client/echo';
import { type DataType } from '@dxos/schema';
import { type Position, type DeepReadonly, type MaybePromise } from '@dxos/util';

import { SPACE_PLUGIN } from '../meta';
import { type ObjectForm, type PluginState } from '../types';

export namespace SpaceCapabilities {
  export const State = defineCapability<DeepReadonly<PluginState>>(`${SPACE_PLUGIN}/capability/state`);
  export const MutableState = defineCapability<PluginState>(`${SPACE_PLUGIN}/capability/state`);

  export type SettingsSection = { id: string; label: Label; position?: Position };
  export const SettingsSection = defineCapability<SettingsSection>(`${SPACE_PLUGIN}/capability/settings-section`);

  export type OnSpaceCreated = (params: { space: Space; rootCollection: DataType.Collection }) => MaybePromise<void>;
  export const OnSpaceCreated = defineCapability<OnSpaceCreated>(`${SPACE_PLUGIN}/capability/on-space-created`);

  export const ObjectForm = defineCapability<ObjectForm<any>>(`${SPACE_PLUGIN}/capability/object-form`);
}
