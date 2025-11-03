//
// Copyright 2025 DXOS.org
//

import { batch } from '@preact/signals-core';

import { type AttentionManager } from '@dxos/plugin-attention';

import { type DeckPluginState } from '../types';

export type SetActiveOptions = {
  next: string[];
  state: DeckPluginState;
  attention?: AttentionManager;
};

export const setActive = ({ next, state, attention }: SetActiveOptions) =>
  batch(() => {
    const active = state.deck.solo ? [state.deck.solo] : state.deck.active;
    const removed = active.filter((id) => !next.includes(id));
    const closed = Array.from(new Set([...state.deck.inactive.filter((id) => !next.includes(id)), ...removed]));

    state.deck.inactive = closed;

    if (state.deck.solo || !state.deck.initialized) {
      state.deck.solo = next[0];
    } else {
      state.deck.active = next;
    }

    if (state.deck.fullscreen && !state.deck.solo) {
      state.deck.fullscreen = false;
    }

    if (attention) {
      const attended = attention.current;
      const [attendedId] = Array.from(attended);
      const isAttendedAvailable = !!attendedId && next.includes(attendedId);
      if (!isAttendedAvailable) {
        const attendedIndex = active.indexOf(attendedId);
        // If outside of bounds, focus on the first/last plank, otherwise focus on the new plank in the same position.
        const index = attendedIndex === -1 ? 0 : attendedIndex >= next.length ? next.length - 1 : attendedIndex;
        return next[index];
      }
    }
  });
