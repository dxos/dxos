//
// Copyright 2025 DXOS.org
//

import { Attention } from '@dxos/react-ui-attention/types';

import { DeckSchema } from '#types';

import * as Navigation from './navigation.ts';

export type SetActiveOptions = {
  next: string[];
  deck: DeckSchema.DeckState;
  attention?: Attention.AttentionManager;
  /** The `flatten` setting; under it the companion flag is deck-wide rather than per plank. */
  flatten?: boolean;
  segments?: { previous?: Navigation.PlankSegments; next?: Navigation.PlankSegments };
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
 * `companionPlanks` after a write that changes which planks are open.
 *
 * A companion closes only when the reader closes it, so an open one follows the deck rather than being
 * pruned with the plank it hung off. The flag is deck-wide under `flatten`. While the deck slides,
 * planks that stay open keep their own flag, and a companion whose plank left lands on the newest.
 */
const carryCompanions = (
  companionPlanks: readonly string[],
  next: readonly string[],
  flatten: boolean | undefined,
): string[] => {
  if (companionPlanks.length === 0 || next.length === 0) {
    return [];
  }
  if (flatten) {
    return [next[next.length - 1]];
  }

  const kept = Array.from(new Set(companionPlanks)).filter((id) => next.includes(id));
  return kept.length > 0 ? kept : [next[next.length - 1]];
};

/**
 * Computes the new active state for the deck without mutating.
 * Returns the updates to apply and optionally an item to attend.
 */
export const computeActiveUpdates = ({
  next,
  deck,
  attention,
  flatten,
  segments,
}: SetActiveOptions): SetActiveResult => {
  // A plank is closed when this write does not carry it, and a write carries a plank under either
  // name: its id, or the URL segment it came from. The projection replaces a placeholder id with the
  // id it resolved to, which is the same plank under a new id but the same segment.
  const carried = new Set<string>(next.flatMap((id) => [id, Navigation.segmentOf(segments?.next, id)]));
  const isOpen = (id: string) => carried.has(id) || carried.has(Navigation.segmentOf(segments?.previous, id));
  const closed = Array.from(new Set([...deck.inactive, ...deck.active].filter((id) => !isOpen(id))));

  const updates = {
    inactive: closed,
    active: next,
    // Deduped and pruned to open planks: entries survived every close, so a long-lived deck accreted
    // one per plank ever opened (a live profile measured fourteen, with duplicates). Only an explicit
    // close empties this, so a companion open on a plank that navigation replaces carries to whatever
    // replaced it — under `flatten` the flag is deck-wide and re-points at the plank now current, and
    // while the deck slides it moves to the newest plank rather than being pruned away with the one
    // it was attached to.
    companionPlanks: carryCompanions(deck.companionPlanks, next, flatten),
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
