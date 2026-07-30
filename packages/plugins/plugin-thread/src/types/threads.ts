//
// Copyright 2026 DXOS.org
//

import { EID } from '@dxos/keys';
import { type Message } from '@dxos/types';

import * as Reaction from './Reaction';
import * as ThreadAnnotation from './ThreadAnnotation';

/**
 * Thread-first channel model. A channel's feed holds every message; a *thread* is the subset
 * sharing a `threadId`, and a thread's id is the id of the root message it branches from. Messages
 * without a `threadId` are roots and make up the main view. Nothing here touches the database —
 * these are pure folds over an already-loaded message list so they stay unit-testable.
 */

/** Aggregate view of one thread, folded from the messages carrying its `threadId`. */
export type ThreadSummary = {
  /** Id of the root message this thread branches from. */
  threadId: string;
  /** The root message, when it is present in the same list. */
  root?: Message.Message;
  /** Thread name, taken from the root message's thread annotation. */
  name?: string;
  /** Replies in the thread, ascending by `created`. */
  replies: readonly Message.Message[];
  /** Distinct reply senders, in first-seen order. */
  participants: readonly string[];
  /** `created` of the most recent reply, or of the root when the thread is empty. */
  lastActivity?: string;
};

/** Folded reactions for one message: one entry per distinct emoji. */
export type ReactionSummary = {
  emoji: string;
  count: number;
  /** Whether the local identity is among the reactors. */
  self: boolean;
};

/**
 * Stable per-sender key. `identityDid` is the only field that survives a rename or a second device;
 * the rest are display fallbacks for bridged senders that carry no DXOS identity.
 */
export const senderKey = (sender: Message.Message['sender']): string =>
  sender.identityDid ?? sender.identityKey ?? sender.email ?? sender.name ?? 'anonymous';

/** Ascending comparator on `created`; malformed or missing dates sort to the epoch. */
const byCreated = (left: { created: string }, right: { created: string }): number => time(left) - time(right);

const time = ({ created }: { created: string }): number => {
  const parsed = Date.parse(created);
  return Number.isFinite(parsed) ? parsed : 0;
};

/** Messages that start no thread of their own — the main channel view. */
export const selectRoots = (messages: readonly Message.Message[]): readonly Message.Message[] =>
  messages.filter((message) => message.threadId === undefined);

/** Messages belonging to one thread, ascending by `created`. */
export const selectThread = (messages: readonly Message.Message[], threadId: string): readonly Message.Message[] =>
  messages.filter((message) => message.threadId === threadId).sort(byCreated);

/**
 * Folds every thread of a channel, keyed by `threadId`.
 *
 * A thread exists because someone created it, which marks its root message (see `ThreadAnnotation`)
 * — creating one is a deliberate act, so an unmarked message is not a thread however many messages
 * sit beside it in the channel. A partition that already holds replies also counts, which keeps
 * threads imported or seeded without the mark (the onboarding exemplar) addressable.
 */
export const foldThreads = (messages: readonly Message.Message[]): ReadonlyMap<string, ThreadSummary> => {
  const rootsById = new Map(selectRoots(messages).map((message) => [message.id, message]));
  const byThread = new Map<string, Message.Message[]>();
  for (const message of messages) {
    if (message.threadId === undefined) {
      continue;
    }
    const replies = byThread.get(message.threadId) ?? [];
    replies.push(message);
    byThread.set(message.threadId, replies);
  }

  const created = [...rootsById.values()].filter((root) => ThreadAnnotation.exists(root));
  const threadIds = new Set([...byThread.keys(), ...created.map((root) => root.id)]);

  const summaries = new Map<string, ThreadSummary>();
  for (const threadId of threadIds) {
    const replies = [...(byThread.get(threadId) ?? [])].sort(byCreated);
    const root = rootsById.get(threadId);
    const participants: string[] = [];
    for (const reply of replies) {
      const key = senderKey(reply.sender);
      if (!participants.includes(key)) {
        participants.push(key);
      }
    }
    summaries.set(threadId, {
      threadId,
      root,
      name: root && ThreadAnnotation.get(root)?.name,
      replies,
      participants,
      lastActivity: replies.at(-1)?.created ?? root?.created,
    });
  }

  return summaries;
};

/**
 * Folds reactions by target message, then by emoji. Reaction items are per-author (the single-writer
 * rule), so a count is the number of distinct senders — a duplicate item from one sender, which an
 * offline retry can produce, must not inflate it.
 */
export const foldReactions = (
  reactions: readonly Reaction.Reaction[],
  identityDid?: string,
): ReadonlyMap<string, readonly ReactionSummary[]> => {
  const byTarget = new Map<string, Map<string, Set<string>>>();
  for (const reaction of reactions) {
    const targetId = targetMessageId(reaction);
    if (!targetId) {
      continue;
    }
    const byEmoji = byTarget.get(targetId) ?? new Map<string, Set<string>>();
    const senders = byEmoji.get(reaction.emoji) ?? new Set<string>();
    senders.add(senderKey(reaction.sender));
    byEmoji.set(reaction.emoji, senders);
    byTarget.set(targetId, byEmoji);
  }

  const folded = new Map<string, readonly ReactionSummary[]>();
  for (const [targetId, byEmoji] of byTarget) {
    const summaries = [...byEmoji].map(([emoji, senders]) => ({
      emoji,
      count: senders.size,
      self: identityDid !== undefined && senders.has(identityDid),
    }));
    folded.set(targetId, summaries);
  }

  return folded;
};

/**
 * The local identity's own reaction with this emoji on this message, if any. Un-reacting tombstones
 * that item, so the toggle has to find it rather than mutate shared state.
 */
export const findOwnReaction = (
  reactions: readonly Reaction.Reaction[],
  { messageId, emoji, identityDid }: { messageId: string; emoji: string; identityDid: string },
): Reaction.Reaction | undefined =>
  reactions.find(
    (reaction) =>
      reaction.emoji === emoji && senderKey(reaction.sender) === identityDid && targetMessageId(reaction) === messageId,
  );

/** Object id an item targets, when its ref addresses an ECHO object. */
export const targetMessageId = (item: { target: { uri: string } }): string | undefined => refEntityId(item.target);

/** Object id a ref addresses, when it points at an ECHO object. */
const refEntityId = (ref: { uri: string }): string | undefined => {
  const eid = EID.tryParse(ref.uri);
  return eid ? EID.getEntityId(eid) : undefined;
};
