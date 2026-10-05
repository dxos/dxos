//
// Copyright 2026 DXOS.org
//

import * as Array from 'effect/Array';
import * as Order from 'effect/Order';

import { type Alarm, isConsumed, isInFlight, isQueued } from '@dxos/assistant';
import { Annotation, Feed, Obj } from '@dxos/echo';
import { DeliveryAnnotation, type DeliveryStatus } from '@dxos/react-ui-assistant';
import { type ContentBlock, Message } from '@dxos/types';

import { type OutboxEntry } from '../../processor/index.ts';

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

/** What the thread knows about a row standing for a prompt on its way to the agent. */
export type DeliveryRow = {
  status: DeliveryStatus;
  /** The client's outbox entry, for a prompt sent from this chat. */
  outboxId?: string;
  /** The agent's queue entry in the feed, once it has landed. */
  entryId?: string;
  /** The user message of the turn the agent ran from it, once that has landed. */
  turnId?: string;
};

export type ThreadProjection = {
  /**
   * The rows to render, in order: the turns, then the prompts the agent has not taken up yet.
   * A prompt is ONE row from submit to its turn — keyed by its outbox id, or its queue entry's id
   * after a reload — so it never shows twice and never remounts as the copies of it land.
   */
  messages: Message.Message[];
  /** Delivery state of the rows standing for prompts, by row id. */
  delivery: ReadonlyMap<string, DeliveryRow>;
  /** Prompts still waiting for the agent (sent or delivered, not yet read). */
  queued: number;
  /** How many rows at the end of {@link messages} are prompts not yet in the history. */
  tail: number;
};

/**
 * The turns a thread should render: those reachable from the feed's head, so a rewind's abandoned turns
 * disappear from the view exactly as they disappear from the model's history — followed by the prompts
 * still on their way to the agent, each with its delivery status.
 *
 * A pending `rewindFrom` truncates the view to what precedes it — the rewound-to prompt and everything
 * after it, since the point of rewinding to a prompt is to re-ask it. The pointer is cleared by the next
 * append (which turns the fork into lineage), so a rewind that is never followed through stays visible
 * as a truncated thread with the prompt restored in the composer.
 *
 * A prompt sent from this chat ({@link OutboxEntry}) is reconciled against the feed in three steps:
 * the client holds it (`sent`), the agent's queue entry lands (`delivered`), and the agent takes it
 * up, marking the entry in flight and appending the turn's own user message (`read`). Each copy is
 * matched to the earliest unclaimed feed message carrying the prompt's blocks that did not exist at
 * submit, so identical prompts pair up in order.
 */
export const projectThread = ({
  feedMessages,
  pendingMessages = [],
  rewindFrom,
  outbox = [],
}: {
  feedMessages: readonly Message.Message[];
  /** Messages produced by the current turn that are not in the feed yet. */
  pendingMessages?: readonly Message.Message[];
  /** Earliest message a pending rewind discards. */
  rewindFrom?: string;
  /** Prompts sent from this chat, in submit order. */
  outbox?: readonly OutboxEntry[];
}): ThreadProjection => {
  const all = Array.dedupeWith([...feedMessages, ...pendingMessages], ({ id: a }, { id: b }) => a === b);
  // A queue entry is not a turn: the turn the agent runs from one appends its own user message, so an
  // entry never joins the history. Until the agent takes it up, it is a row after the history instead.
  const sorted = Array.sort(
    all.filter((message) => !isQueued(message)),
    byAppendOrder,
  );
  const entries = Array.sort(
    all.filter((message) => isQueued(message)),
    byAppendOrder,
  );

  const history = projectHistory(sorted, rewindFrom);
  const claimed = new Set<string>();
  const claim = (candidates: readonly Message.Message[], entry: OutboxEntry): Message.Message | undefined => {
    const match = candidates.find(
      (message) => !claimed.has(message.id) && !entry.known.has(message.id) && carries(message, entry.blocks),
    );
    if (match) {
      claimed.add(match.id);
    }
    return match;
  };

  const delivery = new Map<string, DeliveryRow>();
  // Turns that are this chat's own prompts, swapped for the prompt's row so the row keeps its identity.
  const turns = new Map<string, Message.Message>();
  const tail: Message.Message[] = [];
  const sent: Message.Message[] = [];
  for (const entry of outbox) {
    const queueEntry = claim(entries, entry);
    const turn = claim(sorted, entry);
    const status: DeliveryStatus =
      turn || (queueEntry && (isInFlight(queueEntry) || isConsumed(queueEntry)))
        ? 'read'
        : queueEntry
          ? 'delivered'
          : entry.state === 'failed'
            ? 'failed'
            : 'sent';

    const row = deliveryRow(entry.id, turn ?? queueEntry ?? entry, entry.created, status);
    delivery.set(entry.id, { status, outboxId: entry.id, entryId: queueEntry?.id, turnId: turn?.id });
    if (turn) {
      turns.set(turn.id, row);
    } else {
      // Read but with no turn yet: the turn's message replicates separately and can trail the mark.
      sent.push(row);
    }
  }

  // Waiting entries this chat did not send (another device, or a reload) — they predate the outbox.
  for (const entry of entries) {
    if (!claimed.has(entry.id) && !isConsumed(entry) && !isInFlight(entry)) {
      tail.push(deliveryRow(entry.id, entry, entry.created, 'delivered'));
      delivery.set(entry.id, { status: 'delivered', entryId: entry.id });
    }
  }
  tail.push(...sent);

  const messages = [...history.map((message) => turns.get(message.id) ?? message), ...tail];
  const queued = tail.filter((row) => {
    const status = delivery.get(row.id)?.status;
    return status === 'sent' || status === 'delivered';
  }).length;

  return { messages, delivery, queued, tail: tail.length };
};

const projectHistory = (sorted: readonly Message.Message[], rewindFrom: string | undefined): Message.Message[] => {
  if (rewindFrom !== undefined) {
    const index = sorted.findIndex((message) => message.id === rewindFrom);
    if (index === 0) {
      // Rewound to the first turn: nothing precedes it.
      return [];
    }
    if (index > 0) {
      return collapseToolRuns(Feed.history(sorted, { head: sorted[index - 1].id }).items);
    }
    // Not present — a stale pointer (e.g. the message never replicated); fall through to the feed's
    // own lineage rather than blanking the thread.
  }

  return collapseToolRuns(Feed.history(sorted).items);
};

/**
 * Whether a feed message is a copy of the prompt `blocks`: the queue entry carries them as they are,
 * and the turn's user message carries them after whatever the agent prepends (object versions).
 */
const carries = (message: Message.Message, blocks: readonly ContentBlock.Any[]): boolean => {
  if (message.sender.role !== 'user') {
    return false;
  }

  const texts = message.blocks.flatMap((block) => (block._tag === 'text' ? [textKey(block)] : []));
  const wanted = blocks.flatMap((block) => (block._tag === 'text' ? [textKey(block)] : []));
  return wanted.length > 0 && wanted.every((key, index) => texts[texts.length - wanted.length + index] === key);
};

const textKey = (block: ContentBlock.Text): string => `${block.disposition ?? ''}:${block.text}`;

/** The row last built for a source, reused while its status holds so an unchanged row is not re-rendered. */
const deliveryRows = new WeakMap<object, { id: string; status: DeliveryStatus; row: Message.Message }>();

/**
 * The row a prompt renders as: its content from the latest copy of it, under the row's own id, marked
 * with its delivery status for the renderer's ticks.
 */
const deliveryRow = (
  id: string,
  source: Pick<Message.Message, 'blocks'>,
  created: string,
  status: DeliveryStatus,
): Message.Message => {
  const cached = deliveryRows.get(source);
  if (cached && cached.id === id && cached.status === status) {
    return cached.row;
  }

  const row = Message.make({ id, created, sender: { role: 'user' }, blocks: [...source.blocks] });
  Obj.update(row, (row) => Annotation.set(row, DeliveryAnnotation, status));
  deliveryRows.set(source, { id, status, row });
  return row;
};

/**
 * Alarms that have woken the agent since the last prompt the user typed: the count the runtime caps at
 * `Alarm.MAX_SELF_WAKES`, read from the feed so the status can show it.
 */
export const projectSelfWakes = ({
  feedAlarms,
  messages,
}: {
  feedAlarms: readonly Alarm.Alarm[];
  messages: readonly Message.Message[];
}): number => {
  const lastPrompt = messages.findLast(
    (message) =>
      message.sender.role === 'user' &&
      message.blocks.some((block) => block._tag === 'text' && block.disposition !== 'synthetic'),
  );
  const since = lastPrompt?.created ?? '';
  return feedAlarms.filter((alarm) => isConsumed(alarm) && alarm.created >= since).length;
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

/** A folded run and the messages it was folded from, keyed by the run's first message. */
const foldedRuns = new WeakMap<Message.Message, { run: readonly Message.Message[]; folded: Message.Message }>();

/**
 * The run folded into one message, reusing the previous fold while the run holds the same messages:
 * the thread re-projects on every streamed block, and a fresh object per pass made every tool panel
 * in the thread look changed, re-rendering all of them for each block of the current turn.
 */
const foldRun = (run: readonly Message.Message[]): Message.Message => {
  const [first] = run;
  const cached = foldedRuns.get(first);
  if (cached && cached.run.length === run.length && cached.run.every((message, index) => message === run[index])) {
    return cached.folded;
  }

  const folded = { ...first, blocks: run.flatMap((entry) => entry.blocks) } as Message.Message;
  foldedRuns.set(first, { run, folded });
  return folded;
};

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
      collapsed.push(foldRun(messages.slice(index, end + 1)));
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
