//
// Copyright 2025 DXOS.org
//

import { defineCapability, type Label } from '@dxos/app-framework';
import { type DeepReadonly } from '@dxos/util';

import { DECK_PLUGIN } from '../meta';
import { type DeckState } from '../types';

export namespace DeckCapabilities {
  export const DeckState = defineCapability<DeepReadonly<DeckState>>(`${DECK_PLUGIN}/capability/state`);
  export const MutableDeckState = defineCapability<DeckState>(`${DECK_PLUGIN}/capability/state`);

  export const ComplementaryPanel = defineCapability<{ id: string; label: Label; icon: string }>(
    `${DECK_PLUGIN}/capability/complementary-panel`,
  );
}
