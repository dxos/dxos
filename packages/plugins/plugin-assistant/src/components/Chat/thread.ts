//
// Copyright 2026 DXOS.org
//

import * as Array from 'effect/Array';
import * as Order from 'effect/Order';

import { Feed } from '@dxos/echo';
import { type Message } from '@dxos/types';

/**
 * Append order for {@link Feed.history}, which walks lineage positionally rather than by time.
 *
 * Position is authoritative but server-assigned: locally-written blocks — and every block until a
 * position authority acknowledges them — report `+Infinity`, and a query returns an unordered set, so
 * position alone leaves them in arbitrary order. `created` breaks those ties: sound locally, where one
 * conversation's messages come off one clock, and consulted only when position cannot decide.
 */
export const byAppendOrder: Order.Order<Message.Message> = (a, b) => {
  const positionA = Feed.getPosition(a);
  const positionB = Feed.getPosition(b);
  if (positionA !== positionB) {
    return positionA < positionB ? -1 : 1;
  }
  return a.created < b.created ? -1 : a.created > b.created ? 1 : 0;
};

export type ThreadProjection = {
  /** The turns to render, in append order. */
  messages: Message.Message[];
  /**
   * True once a message continues from `forkPoint`, meaning the feed's own lineage is authoritative and
   * the pending pointer should be cleared.
   */
  forkPointSuperseded: boolean;
};

/**
 * The turns a thread should render: those reachable from the feed's head, so a rewind's abandoned turns
 * disappear from the view exactly as they disappear from the model's history.
 *
 * A pending `forkPoint` reads as the head, so the thread reverts the moment one is recorded — before any
 * continuation exists to express the fork through lineage. Once a message names it as its parent, the
 * feed is self-describing and the pointer is redundant (and reported superseded, so the caller can drop
 * it); leaving it in place would pin the view behind the branch it created.
 */
export const projectThread = ({
  feedMessages,
  pendingMessages = [],
  forkPoint,
}: {
  feedMessages: readonly Message.Message[];
  /** Messages produced by the current turn that are not in the feed yet. */
  pendingMessages?: readonly Message.Message[];
  forkPoint?: string;
}): ThreadProjection => {
  const all = Array.dedupeWith([...feedMessages, ...pendingMessages], ({ id: a }, { id: b }) => a === b);
  const sorted = Array.sort(all, byAppendOrder);
  const forkPointSuperseded =
    forkPoint !== undefined && sorted.some((message) => Feed.getParent(message) === forkPoint);

  return {
    messages: Feed.history(sorted, { head: forkPointSuperseded ? undefined : forkPoint }).items,
    forkPointSuperseded,
  };
};
