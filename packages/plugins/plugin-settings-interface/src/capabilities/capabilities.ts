//
// Copyright 2025 DXOS.org
//

import { defineCapability } from '@dxos/app-framework';

import { SETTINGS_INTERFACE_PLUGIN } from '../meta';

export namespace SettingsInterfaceCapabilities {
  export type State = { selected: string };
  export const State = defineCapability<Readonly<State>>(`${SETTINGS_INTERFACE_PLUGIN}/capability/state`);
  export const MutableState = defineCapability<State>(`${SETTINGS_INTERFACE_PLUGIN}/capability/state`);
}
