//
// Copyright 2025 DXOS.org
//

import { defineCapability } from '@dxos/app-framework';
import { type DeepReadonly } from '@dxos/util';

import { meta } from '../meta';
import { type DeckPluginState } from '../types';

export namespace DeckCapabilities {
  export const DeckState = defineCapability<DeepReadonly<DeckPluginState>>(`${meta.id}/capability/state`);
  export const MutableDeckState = defineCapability<DeckPluginState>(`${meta.id}/capability/state`);
}
