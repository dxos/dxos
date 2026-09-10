//
// Copyright 2025 DXOS.org
//

import { invariant } from '@dxos/invariant';

import { DeckSchema } from '#types';

/** The stored state with `deckUpdates` merged into whichever deck is active. */
export const updateActiveDeck = (
  current: DeckSchema.StoredDeckState,
  deckUpdates: Partial<DeckSchema.DeckState>,
): DeckSchema.StoredDeckState => {
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
