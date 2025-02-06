//
// Copyright 2025 DXOS.org
//

import { batch } from '@preact/signals-core';

import { type AttentionManager } from '@dxos/plugin-attention';

import { type Layout } from '../types';

export type SetActiveOptions = {
  next: string[];
  layout: Layout;
  attention?: AttentionManager;
};

export const setActive = ({ next, layout, attention }: SetActiveOptions) => {
  return batch(() => {
    const active = layout.solo ? [layout.solo] : layout.deck;
    const removed = active.filter((id) => !next.includes(id));
    const closed = Array.from(new Set([...layout.closed.filter((id) => !next.includes(id)), ...removed]));

    layout.closed.splice(0, layout.closed.length, ...closed);

    if (layout.solo) {
      layout.solo = next[0];
    } else {
      layout.deck.splice(0, layout.deck.length, ...next);
    }

    if (attention) {
      const attended = attention.current;
      const [attendedId] = Array.from(attended);
      const isAttendedAvailable = !!attendedId && next.includes(attendedId);
      if (!isAttendedAvailable) {
        const active = layout.solo ? [layout.solo] : layout.deck;
        const attendedIndex = active.indexOf(attendedId);
        // If outside of bounds, focus on the first/last plank, otherwise focus on the new plank in the same position.
        const index = attendedIndex === -1 ? 0 : attendedIndex >= active.length ? active.length - 1 : attendedIndex;
        return active[index];
      }
    }
  });
};
