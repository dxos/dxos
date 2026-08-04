//
// Copyright 2026 DXOS.org
//

import { type Locale } from 'date-fns';
import { format } from 'date-fns/format';
import { startOfDay } from 'date-fns/startOfDay';

import { type ChunkRenderer } from '../model';
import { type MessageLike } from '../types';

/** A day or gap divider between runs of messages. */
export type DividerItem = { id: string; kind: 'divider'; label?: string };

/**
 * One message, tagged with what the run it belongs to makes it: `head` carries the sender's
 * heading and avatar, and the rest of the run continues it.
 */
export type MessageItem = {
  id: string;
  kind: 'message';
  message: MessageLike;
  head: boolean;
  /** Last item of the transcript; suppresses the avatar rail's continuation line. */
  last: boolean;
  /**
   * In-memory text of an edit in progress, rendered in place of the stored body. Held here rather
   * than written to the message so an incoming revision cannot overwrite what is being typed; it
   * reaches the message only on submit.
   */
  draft?: string;
};

export type MessageDocumentItem = DividerItem | MessageItem;

export type MessageDocumentItemOptions = {
  /** Consecutive same-sender messages within this window (ms) belong to one run. */
  groupWindowMs?: number;
  /** Insert a labeled divider before the first message of each calendar day. */
  dayDivider?: boolean;
  /** A same-day gap exceeding this (ms) inserts an unlabeled divider. */
  gapDividerMs?: number;
  dtLocale?: Locale;
  /** Message being edited, and the in-memory text standing in for its stored body. */
  draft?: { id: string; text: string };
};

export const DEFAULT_GROUP_WINDOW_MS = 60_000;
export const DEFAULT_GAP_DIVIDER_MS = 3 * 60 * 60 * 1000;

/** Message send time in epoch ms; malformed/missing `created` sorts as if sent at the epoch. */
const messageTime = (message: MessageLike): number => {
  const time = Date.parse(message.created);
  return Number.isFinite(time) ? time : 0;
};

const senderKey = (message: MessageLike): string =>
  message.sender.identityDid ?? message.sender.identityKey ?? message.sender.email ?? message.sender.name ?? '';

/**
 * Preprocesses ascending, time-ordered `messages` into the chunks the document is rendered from.
 *
 * Same rules the React tile stack applies, and for the same reasons: a day divider precedes the
 * first message of each calendar day, a plain divider marks a same-day gap, only the day divider is
 * emitted when both would fall on the same message, and a divider always starts a new run.
 *
 * Unlike the tile stack each message stays its own chunk rather than being nested inside a group —
 * a run is expressed by the `head` flag. Grouping is presentation, and chunks have to stay 1:1 with
 * messages so a reaction, an edit or a hover toolbar can address one.
 */
export const buildMessageDocumentItems = (
  messages: readonly MessageLike[],
  {
    groupWindowMs = DEFAULT_GROUP_WINDOW_MS,
    dayDivider = true,
    gapDividerMs = DEFAULT_GAP_DIVIDER_MS,
    dtLocale,
    draft,
  }: MessageDocumentItemOptions = {},
): MessageDocumentItem[] => {
  const items: MessageDocumentItem[] = [];
  let runSender: string | undefined;
  let runLastTime: number | undefined;
  let prevTime: number | undefined;
  let prevDay: number | undefined;

  for (const message of messages) {
    const time = messageTime(message);
    const day = startOfDay(time).getTime();

    const dayBoundary = dayDivider && (prevDay === undefined || day !== prevDay);
    const gapBoundary = !dayBoundary && prevTime !== undefined && time - prevTime > gapDividerMs;

    if (dayBoundary) {
      items.push({
        kind: 'divider',
        id: `divider:day:${day}`,
        label: format(day, 'EEEE, MMMM d', { locale: dtLocale }),
      });
      runSender = undefined;
    } else if (gapBoundary) {
      items.push({ kind: 'divider', id: `divider:gap:${time}` });
      runSender = undefined;
    }

    const sender = senderKey(message);
    const continues = runSender === sender && runLastTime !== undefined && time - runLastTime <= groupWindowMs;
    items.push({
      kind: 'message',
      id: message.id,
      message,
      head: !continues,
      last: false,
      ...(draft?.id === message.id ? { draft: draft.text } : {}),
    });
    runSender = sender;
    runLastTime = time;

    prevTime = time;
    prevDay = day;
  }

  const tail = items.at(-1);
  if (tail?.kind === 'message') {
    tail.last = true;
  }

  return items;
};

/** Text of a message's first text block, which is all the document itself carries. */
export const getMessageText = (message: MessageLike): string => {
  const block = message.blocks.find((block) => block._tag === 'text');
  return block?._tag === 'text' ? block.text : '';
};

/**
 * Renders an item to document text.
 *
 * Only the message body reaches the document — author, timestamp, avatar, reactions and dividers
 * are decorations the extension derives from the model's chunk ranges. Keeping chrome out of the
 * text is what leaves the body as plain markdown: it wraps, it is selectable across messages, and
 * find matches it without stepping through markup.
 *
 * A divider renders to nothing at all: its widget hangs off the head of the message that follows,
 * so it costs no line and leaves no blank row to style away.
 */
export const renderMessageDocumentItem: ChunkRenderer<MessageDocumentItem> = (item) =>
  item.kind === 'divider' ? '' : `${item.draft ?? getMessageText(item.message)}\n`;
