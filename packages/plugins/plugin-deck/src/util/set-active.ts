//
// Copyright 2025 DXOS.org
//

import { Attention } from '@dxos/react-ui-attention';

import { type DeckState } from '#types';

export type SetActiveOptions = {
  next: string[];
  deck: DeckState;
  attention?: Attention.AttentionManager;
};

export type SetActiveResult = {
  /** Updates to apply to the deck. */
  deckUpdates: {
    inactive: string[];
    active: string[];
    companionPlanks: string[];
  };
  /** ID of the item to attend (scroll into view) if attention changed. */
  toAttend?: string;
};

/**
 * Computes the new active state for the deck without mutating.
 * Returns the updates to apply and optionally an item to attend.
 */
export const computeActiveUpdates = ({ next, deck, attention }: SetActiveOptions): SetActiveResult => {
  const removed = deck.active.filter((id) => !next.includes(id));
  const closed = Array.from(new Set([...deck.inactive.filter((id) => !next.includes(id)), ...removed]));

  const updates = {
    inactive: closed,
    active: next,
    // Deduped and pruned to open planks: entries survived every close, so a long-lived deck accreted
    // one per plank ever opened (a live profile measured fourteen, with duplicates).
    companionPlanks: Array.from(new Set(deck.companionPlanks)).filter((id) => next.includes(id)),
  };

  let toAttend: string | undefined;
  if (attention) {
    const attended = attention.getCurrent();
    const [attendedId] = Array.from(attended);
    const isAttendedAvailable = !!attendedId && next.includes(attendedId);
    if (!isAttendedAvailable) {
      const attendedIndex = deck.active.indexOf(attendedId);
      // If outside of bounds, focus on the first/last plank, otherwise focus on the new plank in the same position.
      const index = attendedIndex === -1 ? 0 : attendedIndex >= next.length ? next.length - 1 : attendedIndex;
      toAttend = next[index];
    }
  }

  return { deckUpdates: updates, toAttend };
};
