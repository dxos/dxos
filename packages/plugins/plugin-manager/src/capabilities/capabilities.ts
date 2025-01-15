//
// Copyright 2025 DXOS.org
//

import { defineCapability } from '@dxos/app-framework';

import { MANAGER_PLUGIN } from '../meta';

export namespace ManagerCapabilities {
  export type State = { selected: string };
  export const State = defineCapability<Readonly<State>>(`${MANAGER_PLUGIN}/capability/state`);
  export const MutableState = defineCapability<State>(`${MANAGER_PLUGIN}/capability/state`);
}
