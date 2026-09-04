//
// Copyright 2025 DXOS.org
//

import { Attention } from '@dxos/react-ui-attention/types';

import { DeckSchema } from '#types';

/**
 * Whether an automatic navigation may still apply.
 *
 * Invoking a layout operation is not instantaneous — a lazily imported handler alone costs a few
 * hundred milliseconds — and the write happens at the end of that. A caller that is not the reader
 * (boot-time seeding, a restore) therefore passes the active ids it decided against, and its write
 * is dropped if the reader has moved since. A caller that IS the reader passes nothing and always
 * wins.
 *
 * Exact and order-sensitive: a deck showing the same planks in a different order is a different
 * view, and the reader put it that way.
 */
export const expectationHolds = (active: readonly string[], expected: readonly string[] | undefined): boolean =>
  expected === undefined || (active.length === expected.length && active.every((id, index) => id === expected[index]));

export type SetActiveOptions = {
  next: string[];
  deck: DeckSchema.DeckState;
  attention?: Attention.AttentionManager;
  /** The `flatten` setting; under it the companion flag is deck-wide rather than per plank. */
  flatten?: boolean;
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
export const computeActiveUpdates = ({ next, deck, attention, flatten }: SetActiveOptions): SetActiveResult => {
  const removed = deck.active.filter((id) => !next.includes(id));
  const closed = Array.from(new Set([...deck.inactive.filter((id) => !next.includes(id)), ...removed]));

  const updates = {
    inactive: closed,
    active: next,
    // Deduped and pruned to open planks: entries survived every close, so a long-lived deck accreted
    // one per plank ever opened (a live profile measured fourteen, with duplicates). Under `flatten`
    // the flag is deck-wide, so closing the plank that happens to carry it re-points it at whichever
    // plank is now current — pruning it away would shut a companion the user never closed.
    companionPlanks: flatten
      ? deck.companionPlanks.length > 0 && next.length > 0
        ? [next[next.length - 1]]
        : []
      : Array.from(new Set(deck.companionPlanks)).filter((id) => next.includes(id)),
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
