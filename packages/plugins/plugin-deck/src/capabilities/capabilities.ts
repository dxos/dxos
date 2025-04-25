//
// Copyright 2025 DXOS.org
//

import { defineCapability } from '@dxos/app-framework';
import { type DeepReadonly } from '@dxos/util';

import { DECK_PLUGIN } from '../meta';
import { type DeckPluginState } from '../types';

export namespace DeckCapabilities {
  export const DeckState = defineCapability<DeepReadonly<DeckPluginState>>(`${DECK_PLUGIN}/capability/state`);
  export const MutableDeckState = defineCapability<DeckPluginState>(`${DECK_PLUGIN}/capability/state`);
}
