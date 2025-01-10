//
// Copyright 2025 DXOS.org
//

import { defineCapability } from '@dxos/app-framework/next';
import { type DeepReadonly } from '@dxos/util';

import { SPACE_PLUGIN } from '../meta';
import { type PluginState } from '../types';

export namespace SpaceCapabilities {
  export const State = defineCapability<DeepReadonly<PluginState>>(`${SPACE_PLUGIN}/state`);
  export const MutableState = defineCapability<PluginState>(`${SPACE_PLUGIN}/state`);
}
