//
// Copyright 2025 DXOS.org
//

import { batch } from '@preact/signals-core';

import { create } from '@dxos/live-object';
import { type AttentionManager } from '@dxos/plugin-attention';

import { type Deck, type DeckState } from '../types';

export type SetActiveOptions = {
  next: string[];
  state: DeckState;
  attention?: AttentionManager;
};

export const setActive = ({ next, state, attention }: SetActiveOptions) => {
  return batch(() => {
    let deck = state.decks[state.activeDeck];
    if (!deck) {
      deck = create<Deck>({ active: [], inactive: [] });
      state.decks[state.activeDeck] = deck;
    }

    const active = state.solo ? [state.solo] : deck.active;
    const removed = active.filter((id) => !next.includes(id));
    const closed = Array.from(new Set([...deck.inactive.filter((id) => !next.includes(id)), ...removed]));

    deck.inactive = closed;

    if (state.solo) {
      state.solo = next[0];
    } else {
      deck.active = next;
    }

    if (attention) {
      const attended = attention.current;
      const [attendedId] = Array.from(attended);
      const isAttendedAvailable = !!attendedId && next.includes(attendedId);
      if (!isAttendedAvailable) {
        const active = state.solo ? [state.solo] : deck.active;
        const attendedIndex = active.indexOf(attendedId);
        // If outside of bounds, focus on the first/last plank, otherwise focus on the new plank in the same position.
        const index = attendedIndex === -1 ? 0 : attendedIndex >= active.length ? active.length - 1 : attendedIndex;
        return active[index];
      }
    }
  });
};
