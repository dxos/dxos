//
// Copyright 2025 DXOS.org
//

import { type Label } from '@dxos/app-framework';
import { defineCapability } from '@dxos/app-framework/next';
import { type DeepReadonly } from '@dxos/util';

import { type DeckContextType } from '../components';
import { DECK_PLUGIN } from '../meta';

export namespace DeckCapabilities {
  export const DeckState = defineCapability<DeepReadonly<DeckContextType>>(`${DECK_PLUGIN}/state`);
  export const MutableDeckState = defineCapability<DeckContextType>(`${DECK_PLUGIN}/state`);
  export const ComplementaryPanel = defineCapability<{ id: string; label: Label; icon: string }>(
    `${DECK_PLUGIN}/complementary-panel`,
  );
}
