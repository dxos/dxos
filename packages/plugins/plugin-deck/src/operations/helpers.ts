//
// Copyright 2025 DXOS.org
//

import { invariant } from '@dxos/invariant';

import { type DeckState, type StoredDeckState } from '../types';

/** The active deck's `companionPlanks` with `plankId` marked open, idempotently. */
export const addCompanionPlank = (current: StoredDeckState, plankId: string): string[] => {
  const open = current.decks[current.activeDeck]?.companionPlanks ?? [];
  return open.includes(plankId) ? [...open] : [...open, plankId];
};

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
