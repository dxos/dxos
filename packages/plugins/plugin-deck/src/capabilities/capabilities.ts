//
// Copyright 2025 DXOS.org
//

import { defineInterface } from '@dxos/app-framework/next';
import { type DeepReadonly } from '@dxos/util';

import { type DeckContextType } from '../components';
import { DECK_PLUGIN } from '../meta';

export namespace DeckCapabilities {
  export const DeckState = defineInterface<DeepReadonly<DeckContextType>>(`${DECK_PLUGIN}/state`);
  export const MutableDeckState = defineInterface<DeckContextType>(`${DECK_PLUGIN}/state`);
}
