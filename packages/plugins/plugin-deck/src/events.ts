//
// Copyright 2025 DXOS.org
//

import { Events } from '@dxos/app-framework/next';

import { DECK_PLUGIN } from './meta';

export namespace DeckEvents {
  export const SettingsReady = Events.createStateEvent(`${DECK_PLUGIN}/settings-ready`);

  export const StateReady = Events.createStateEvent(`${DECK_PLUGIN}/state-ready`);
}
