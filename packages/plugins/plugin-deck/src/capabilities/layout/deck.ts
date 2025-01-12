//
// Copyright 2025 DXOS.org
//

import { contributes } from '@dxos/app-framework';
import { LocalStorageStore } from '@dxos/local-storage';

import { type DeckContextType } from '../../components';
import { DeckCapabilities } from '../capabilities';

// NOTE: The key is this currently for backwards compatibility of storage.
const DECK_KEY = 'dxos.org/settings/deck';

export default () => {
  const deck = new LocalStorageStore<DeckContextType>(DECK_KEY, {
    plankSizing: {},
    currentUndoId: undefined,
    // TODO(Zan): Cap depth!
    layoutModeHistory: [],
  });

  deck.prop({ key: 'plankSizing', type: LocalStorageStore.json<Record<string, number>>() });

  return contributes(DeckCapabilities.DeckState, deck.values, () => deck.close());
};
