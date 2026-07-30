//
// Copyright 2026 DXOS.org
//

import * as Array from 'effect/Array';
import * as Order from 'effect/Order';

import { Feed, Obj } from '@dxos/echo';
import { Message } from '@dxos/types';

/**
 * Append order for {@link Feed.history}, which walks lineage positionally rather than by time.
 *
 * Position is authoritative but server-assigned: locally-written blocks — and every block until a
 * position authority acknowledges them — report `+Infinity`, and a query returns an unordered set, so
 * position alone leaves them in arbitrary order. `created` breaks those ties: sound locally, where one
 * conversation's messages come off one clock, and consulted only when position cannot decide.
 */
export const byAppendOrder: Order.Order<Message.Message | Feed.Reset> = (a, b) => {
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
};

/**
 * The turns a thread should render: those reachable from the feed's head, so a rewind's abandoned turns
 * disappear from the view exactly as they disappear from the model's history.
 *
 * A pending `rewindFrom` truncates the view to what precedes it — the rewound-to prompt and everything
 * after it, since the point of rewinding to a prompt is to re-ask it. It is the deciding client's own
 * intent, so an unsent rewind shows as a truncated thread with the prompt restored in the composer,
 * while costing the conversation nothing; once sent, lineage takes over and this is no longer needed.
 */
export const projectThread = ({
  feedMessages,
  feedResets = [],
  pendingMessages = [],
  rewindFrom,
}: {
  feedMessages: readonly Message.Message[];
  /** Forks in the feed. Reachability depends on them, so a walk without them resurrects abandoned turns. */
  feedResets?: readonly Feed.Reset[];
  /** Messages produced by the current turn that are not in the feed yet. */
  pendingMessages?: readonly Message.Message[];
  /** Earliest message a rewind being composed discards; local to the deciding client until submitted. */
  rewindFrom?: string;
}): ThreadProjection => {
  const all = Array.dedupeWith([...feedMessages, ...feedResets, ...pendingMessages], ({ id: a }, { id: b }) => a === b);
  const sorted = Array.sort(all, byAppendOrder);

  if (rewindFrom !== undefined) {
    const index = sorted.findIndex((item) => item.id === rewindFrom);
    if (index === 0) {
      // Rewound to the first turn: nothing precedes it.
      return { messages: [] };
    }
    if (index > 0) {
      return { messages: onlyMessages(Feed.history(sorted, { head: sorted[index - 1].id }).items) };
    }
    // Not present — a stale pointer (e.g. the message never replicated); fall through to the feed's
    // own lineage rather than blanking the thread.
  }

  return { messages: onlyMessages(Feed.history(sorted).items) };
};

/** Resets take part in the walk but are not conversation, so they never reach the view. */
const onlyMessages = (items: readonly (Message.Message | Feed.Reset)[]): Message.Message[] =>
  items.filter((item) => Obj.instanceOf(Message.Message, item));

/**
 * What a rewind to `messageId` implies: the messages to discard from, and the prompt text to restore so
 * the user can edit and resend it.
 *
 * Returns `undefined` when the message is absent, so a stale click is a no-op rather than a truncation.
 */
export const resolveRewind = (
  messages: readonly Message.Message[],
  messageId: string,
): { rewindFrom: string; text: string } | undefined => {
  const message = messages.find((candidate) => candidate.id === messageId);
  if (!message) {
    return undefined;
  }
  return { rewindFrom: messageId, text: Message.extractText(message) };
};

/**
 * The item a fork resumes at, given the thread a pending rewind has already truncated: its last
 * message. {@link projectThread} truncates to exactly what precedes the discarded message, so the tail
 * of what it returns is the fork point — no second search, and the view and the fork cannot disagree.
 *
 * `undefined` when the rewind emptied the thread, and the fork then starts a fresh line — which is why
 * the discarded message is what gets named and no sentinel is needed.
 *
 * Resolving to the last *message* rather than to a reset that may sit after it is deliberate: both
 * abandon the same turns, and parenting to conversation keeps the lineage legible.
 */
export const resolveForkParent = (messages: readonly Message.Message[]): Message.Message | undefined => messages.at(-1);
