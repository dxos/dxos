//
// Copyright 2025 DXOS.org
//

import { defineCapability } from '@dxos/app-framework';

import { MANAGER_PLUGIN } from '../meta';
import { type SettingsState } from '../types';

export namespace ManagerCapabilities {
  export const State = defineCapability<Readonly<SettingsState>>(`${MANAGER_PLUGIN}/capability/state`);
  export const MutableState = defineCapability<SettingsState>(`${MANAGER_PLUGIN}/capability/state`);
}
