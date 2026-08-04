//
// Copyright 2025 DXOS.org
//

import { invariant } from '@dxos/invariant';

import * as DeckSchema from '../types/DeckSchema';

/** The active deck's `companionPlanks` with `plankId` marked open, idempotently. */
export const addCompanionPlank = (current: DeckSchema.StoredDeckState, plankId: string): string[] => {
  const open = current.decks[current.activeDeck]?.companionPlanks ?? [];
  return open.includes(plankId) ? [...open] : [...open, plankId];
};

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
