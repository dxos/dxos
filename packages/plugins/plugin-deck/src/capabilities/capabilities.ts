//
// Copyright 2025 DXOS.org
//

import { defineCapability } from '@dxos/app-framework/next';
import { type DeepReadonly } from '@dxos/util';

import { type DeckContextType } from '../components';
import { DECK_PLUGIN } from '../meta';

export namespace DeckCapabilities {
  export const DeckState = defineCapability<DeepReadonly<DeckContextType>>(`${DECK_PLUGIN}/state`);
  export const MutableDeckState = defineCapability<DeckContextType>(`${DECK_PLUGIN}/state`);
}
