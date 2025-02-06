//
// Copyright 2025 DXOS.org
//

import { defineCapability, type Label } from '@dxos/app-framework';
import { type DeepReadonly } from '@dxos/util';

import { DECK_PLUGIN } from '../meta';
import { type Layout } from '../types';

export namespace DeckCapabilities {
  export const DeckState = defineCapability<DeepReadonly<Layout>>(`${DECK_PLUGIN}/capability/state`);
  export const MutableDeckState = defineCapability<Layout>(`${DECK_PLUGIN}/capability/state`);

  export const ComplementaryPanel = defineCapability<{ id: string; label: Label; icon: string }>(
    `${DECK_PLUGIN}/capability/complementary-panel`,
  );
}
