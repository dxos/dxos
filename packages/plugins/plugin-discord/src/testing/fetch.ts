//
// Copyright 2026 DXOS.org
//

import { DiscordREST } from 'dfx';
import type { MessageResponse } from 'dfx/types';
import * as Effect from 'effect/Effect';

import { Obj } from '@dxos/echo';
import { ContentBlock, Message } from '@dxos/types';

import { DEFAULT_DAYS, DISCORD_SOURCE, snowflakeForTimestamp } from '../constants';

const MAX_DAYS = 365 * 3;
const MESSAGE_PAGE_LIMIT = 100;

const computeInitialCursor = (cursor: string | undefined, maxDays?: number): string => {
  if (cursor) {
    return cursor;
  }

  const days = typeof maxDays === 'number' && maxDays > 0 ? Math.min(maxDays, MAX_DAYS) : DEFAULT_DAYS;
  return snowflakeForTimestamp(Date.now() - days * 24 * 60 * 60 * 1000);
};

const mapDiscordMessage = (message: MessageResponse): Message.Message | undefined => {
  const type = message.type ?? 0;
  if (type !== 0 && type !== 19) {
    return undefined;
  }
  const text = message.content;
  const blocks: ContentBlock.Any[] = text.length > 0 ? [{ _tag: 'text', text } as ContentBlock.Text] : [];
  const referenced =
    message.type === 19
      ? (message.referenced_message?.id ?? message.message_reference?.message_id)
      : message.referenced_message?.id;
  const senderName =
    (message.author.global_name && message.author.global_name.length > 0 ? message.author.global_name : undefined) ??
    message.author.username;
  return Message.make({
    [Obj.Meta]: { keys: [{ source: DISCORD_SOURCE, id: message.id }] },
    created: message.timestamp,
    threadId: referenced,
    sender: { role: 'user', name: senderName },
    blocks,
  });
};

/** Drain all pages of messages from a channel/thread into a flat array, oldest-first. */
const drainMessages = (channelId: string, after: string): Effect.Effect<MessageResponse[], unknown, DiscordREST> =>
  Effect.gen(function* () {
    const rest = yield* DiscordREST;
    const raw: MessageResponse[] = [];
    let cursor = after;
    while (true) {
      const page = yield* rest.listMessages(channelId, { after: cursor, limit: MESSAGE_PAGE_LIMIT });
      if (page.length === 0) {
        break;
      }
      const sorted = [...page].sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0));
      raw.push(...sorted);
      if (sorted.length < MESSAGE_PAGE_LIMIT) {
        break;
      }
      cursor = sorted[sorted.length - 1].id;
    }
    return raw;
  });

export type FetchOptions = {
  /** Start cursor (Discord snowflake id). When set, only messages newer than this id are fetched. */
  cursor?: string;
  /** How many days of history to fetch on the first sync (when cursor is absent). Default: 30. */
  maxDays?: number;
};

/** Fetch result for a single Discord thread sub-channel. */
export type ThreadFetchResult = {
  /** The thread's own Discord channel id. */
  channelId: string;
  /** Id of the message in the parent channel that started this thread. */
  parentMessageId: string;
  /** Display name of the thread. */
  name: string;
  messages: Message.Message[];
  /** Snowflake id of the newest thread message fetched; persist as the next cursor. */
  cursor: string | undefined;
  /** ISO-8601 timestamp of when the thread was fetched. */
  fetchedAt: string;
};

export type FetchResult = {
  messages: Message.Message[];
  /** Snowflake id of the newest message fetched; persist as the next cursor. */
  cursor: string | undefined;
  /** ISO-8601 timestamp of when the fetch completed. */
  fetchedAt: string;
  /** Thread sub-channels discovered from messages in this window, each fetched separately. */
  threads: ThreadFetchResult[];
};

/** Binding-level state that mirrors the fields written onto a `SyncBinding`. */
export type BindingState = {
  channelId: string;
  cursor: string | undefined;
  fetchedAt: string;
};

/** Binding-level state for a thread. */
export type ThreadBindingState = BindingState & {
  parentMessageId: string;
  name: string;
};

/**
 * Fixture shape produced by `generate-fixtures.ts`.
 * `state` mirrors the `SyncBinding` cursor fields; `messages` is the feed content.
 * Each discovered thread is stored as a separate entry with its own state.
 */
export type DiscordChannelFixture = {
  state: BindingState;
  messages: Message.Message[];
  threads: Array<{ state: ThreadBindingState; messages: Message.Message[] }>;
};

/**
 * Fetch all messages newer than `options.cursor` (or the initial lookback window)
 * from a Discord channel, plus all thread sub-channels spawned by messages in
 * that window. Each thread is returned as a separate `ThreadFetchResult`.
 *
 * Depends only on `DiscordREST`; no ECHO required.
 */
export const fetchChannelMessages = (
  channelId: string,
  options?: FetchOptions,
): Effect.Effect<FetchResult, unknown, DiscordREST> =>
  Effect.gen(function* () {
    const initialAfter = computeInitialCursor(options?.cursor, options?.maxDays);
    const raw = yield* drainMessages(channelId, initialAfter);

    const messages = raw.map(mapDiscordMessage).filter((msg): msg is Message.Message => msg !== undefined);
    const cursor = raw.length > 0 ? raw[raw.length - 1].id : options?.cursor;

    // Discover threads from messages in this window and fetch each separately.
    const threads: ThreadFetchResult[] = [];
    for (const msg of raw) {
      if (!msg.thread) {
        continue;
      }
      const threadId = msg.thread.id;
      const threadName = msg.thread.name;
      const threadRaw = yield* drainMessages(threadId, '0');
      const threadMessages = threadRaw
        .map(mapDiscordMessage)
        .filter((threadMsg): threadMsg is Message.Message => threadMsg !== undefined);
      threads.push({
        channelId: threadId,
        parentMessageId: msg.id,
        name: threadName,
        messages: threadMessages,
        cursor: threadRaw.length > 0 ? threadRaw[threadRaw.length - 1].id : undefined,
        fetchedAt: new Date().toISOString(),
      });
    }

    return { messages, cursor, fetchedAt: new Date().toISOString(), threads };
  });
