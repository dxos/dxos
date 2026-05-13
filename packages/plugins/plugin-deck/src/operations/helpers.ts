//
// Copyright 2025 DXOS.org
//

import { invariant } from '@dxos/invariant';

import { type DeckState, type StoredDeckState } from '../types';

export const updateActiveDeck = (current: StoredDeckState, deckUpdates: Partial<DeckState>): StoredDeckState => {
  const currentDeck = current.decks[current.activeDeck];
  invariant(currentDeck, `Deck not found: ${current.activeDeck}`);
  return {
    ...current,
    decks: {
      ...current.decks,
      [current.activeDeck]: {
        ...currentDeck,
        ...deckUpdates,
      },
    },
  };
};
