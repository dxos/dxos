//
// Copyright 2025 DXOS.org
//

import { defineCapability } from '@dxos/app-framework';
import { type DeepReadonly } from '@dxos/util';

import { DECK_PLUGIN } from '../meta';
import { type DeckState, type Panel } from '../types';

export namespace DeckCapabilities {
  export const DeckState = defineCapability<DeepReadonly<DeckState>>(`${DECK_PLUGIN}/capability/state`);
  export const MutableDeckState = defineCapability<DeckState>(`${DECK_PLUGIN}/capability/state`);
  export const ComplementaryPanel = defineCapability<Panel>(`${DECK_PLUGIN}/capability/complementary-panel`);
}
