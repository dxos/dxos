//
// Copyright 2025 DXOS.org
//

import { Events } from '@dxos/app-framework';

import { DECK_PLUGIN } from './meta';

export namespace DeckEvents {
  export const SetupComplementaryPanels = Events.createStateEvent(`${DECK_PLUGIN}/setup-complementary-panels`);
  export const StateReady = Events.createStateEvent(`${DECK_PLUGIN}/state-ready`);
}
