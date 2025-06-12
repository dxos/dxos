//
// Copyright 2025 DXOS.org
//

import { defineCapability, type Label } from '@dxos/app-framework';
import { type Position, type DeepReadonly } from '@dxos/util';

import { SPACE_PLUGIN } from '../meta';
import { type ObjectForm, type PluginState } from '../types';

export namespace SpaceCapabilities {
  export const State = defineCapability<DeepReadonly<PluginState>>(`${SPACE_PLUGIN}/capability/state`);
  export const MutableState = defineCapability<PluginState>(`${SPACE_PLUGIN}/capability/state`);

  export type SettingsSection = { id: string; label: Label; position?: Position };
  export const SettingsSection = defineCapability<SettingsSection>(`${SPACE_PLUGIN}/capability/settings-section`);

  export const ObjectForm = defineCapability<ObjectForm<any>>(`${SPACE_PLUGIN}/capability/object-form`);
}
