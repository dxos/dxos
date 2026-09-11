//
// Copyright 2026 DXOS.org
//

import * as Array from 'effect/Array';
import * as Order from 'effect/Order';

import { type Alarm, isConsumed, isInFlight, isQueued } from '@dxos/assistant';
import { Feed } from '@dxos/echo';
import { Message } from '@dxos/types';

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
   * Queued input the agent has not taken up yet, in append order. Rendered as its own stack above
   * the prompt rather than in the thread: it is work waiting, not a turn that happened. An entry the
   * running turn has taken up is not waiting, so it leaves this stack the moment the thread shows it.
   */
  queued: Message.Message[];
};

/**
 * The turns a thread should render: those reachable from the feed's head, so a rewind's abandoned turns
 * disappear from the view exactly as they disappear from the model's history.
 *
 * A pending `rewindFrom` truncates the view to what precedes it — the rewound-to prompt and everything
 * after it, since the point of rewinding to a prompt is to re-ask it. The pointer is cleared by the next
 * append (which turns the fork into lineage), so a rewind that is never followed through stays visible
 * as a truncated thread with the prompt restored in the composer.
 */
export const projectThread = ({
  feedMessages,
  pendingMessages = [],
  rewindFrom,
}: {
  feedMessages: readonly Message.Message[];
  /** Messages produced by the current turn that are not in the feed yet. */
  pendingMessages?: readonly Message.Message[];
  /** Earliest message a pending rewind discards. */
  rewindFrom?: string;
}): ThreadProjection => {
  const all = Array.dedupeWith([...feedMessages, ...pendingMessages], ({ id: a }, { id: b }) => a === b);
  // A queue entry is not a turn: the turn the agent runs from one appends its own user message, so an
  // entry never joins the thread. While it waits it belongs to the queue stack instead.
  const sorted = Array.sort(
    all.filter((message) => !isQueued(message)),
    byAppendOrder,
  );
  // An in-flight entry is already speaking through the thread's user message, and its ack does not
  // land until the turn ends — so the flag, not the ack, is what takes it out of the queue.
  const queued = Array.sort(
    all.filter((message) => isQueued(message) && !isConsumed(message) && !isInFlight(message)),
    byAppendOrder,
  );

  if (rewindFrom !== undefined) {
    const index = sorted.findIndex((message) => message.id === rewindFrom);
    if (index === 0) {
      // Rewound to the first turn: nothing precedes it.
      return { messages: [], queued };
    }
    if (index > 0) {
      return { messages: collapseToolRuns(Feed.history(sorted, { head: sorted[index - 1].id }).items), queued };
    }
    // Not present — a stale pointer (e.g. the message never replicated); fall through to the feed's
    // own lineage rather than blanking the thread.
  }

  return { messages: collapseToolRuns(Feed.history(sorted).items), queued };
};

/**
 * The alarms still waiting to fire, earliest first: those the agent has not consumed and (for a
 * cancelled one) not removed from the feed.
 */
export const projectAlarms = ({ feedAlarms }: { feedAlarms: readonly Alarm.Alarm[] }): Alarm.Alarm[] =>
  Array.sort(
    feedAlarms.filter((alarm) => !isConsumed(alarm)),
    Order.mapInput(Order.Number, (alarm: Alarm.Alarm) => alarm.wakeAt),
  );

/**
 * Blocks that are the machinery of a turn rather than anything the reader wrote or read.
 *
 * `reasoning` and `status` are machinery too: the model explains itself and narrates what it is
 * about to do between calls, so a run of calls is interleaved with both and treating either as prose
 * would split every run into one panel per call. A tool result recovered across a reload arrives as
 * a synthetic text block rather than a tool result (its call id can no longer be answered), which is
 * machinery on the same grounds.
 */
const TOOL_BLOCKS = new Set(['toolCall', 'toolResult', 'stats', 'reasoning', 'status']);

const isMachinery = (block: Message.Message['blocks'][number]): boolean =>
  TOOL_BLOCKS.has(block._tag) ||
  (block._tag === 'text' && (block as { disposition?: string }).disposition === 'synthetic');

const isToolOnly = (message: Message.Message): boolean =>
  message.blocks.length > 0 && message.blocks.every(isMachinery);

/**
 * Folds each run of tool-only messages into one, so a multi-step turn renders as a single panel.
 *
 * The runtime delivers one block per message, so without this a turn is one row per call and the
 * panel's summary cannot count the run it belongs to. The run's first message supplies the identity,
 * keeping the row stable as the run grows and leaving `data-object-id` pointing at a real object.
 */
export const collapseToolRuns = (messages: readonly Message.Message[]): Message.Message[] => {
  const collapsed: Message.Message[] = [];
  for (let index = 0; index < messages.length; index++) {
    const message = messages[index];
    if (!isToolOnly(message)) {
      collapsed.push(message);
      continue;
    }

    let end = index;
    while (end + 1 < messages.length && isToolOnly(messages[end + 1])) {
      end++;
    }

    if (end === index) {
      collapsed.push(message);
    } else {
      const run = messages.slice(index, end + 1);
      collapsed.push({ ...message, blocks: run.flatMap((entry) => entry.blocks) } as Message.Message);
    }

    index = end;
  }

  return collapsed;
};

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
