//
// Copyright 2025 DXOS.org
//

import { batch } from '@preact/signals-core';

import { type AttentionManager } from '@dxos/plugin-attention';

import { type DeckState } from '../types';

export type SetActiveOptions = {
  next: string[];
  state: DeckState;
  attention?: AttentionManager;
};

export const setActive = ({ next, state, attention }: SetActiveOptions) => {
  return batch(() => {
    const active = state.solo ? [state.solo] : state.deck;
    const removed = active.filter((id) => !next.includes(id));
    const closed = Array.from(new Set([...state.closed.filter((id) => !next.includes(id)), ...removed]));

    state.closed.splice(0, state.closed.length, ...closed);

    if (state.solo) {
      state.solo = next[0];
    } else {
      state.deck.splice(0, state.deck.length, ...next);
    }

    if (attention) {
      const attended = attention.current;
      const [attendedId] = Array.from(attended);
      const isAttendedAvailable = !!attendedId && next.includes(attendedId);
      if (!isAttendedAvailable) {
        const active = state.solo ? [state.solo] : state.deck;
        const attendedIndex = active.indexOf(attendedId);
        // If outside of bounds, focus on the first/last plank, otherwise focus on the new plank in the same position.
        const index = attendedIndex === -1 ? 0 : attendedIndex >= active.length ? active.length - 1 : attendedIndex;
        return active[index];
      }
    }
  });
};
