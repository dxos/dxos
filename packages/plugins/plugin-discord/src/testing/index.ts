//
// Copyright 2026 DXOS.org
//

import { DiscordREST } from 'dfx';
import type { MessageResponse } from 'dfx/types';
import * as Effect from 'effect/Effect';

import { Obj } from '@dxos/echo';
import { ContentBlock, Message } from '@dxos/types';

import { DEFAULT_DAYS_OF_HISTORY, DISCORD_SOURCE, snowflakeForTimestamp } from '../constants';

const MAX_DAYS_OF_HISTORY = 365 * 3;
const MESSAGE_PAGE_LIMIT = 100;

const computeInitialCursor = (cursor: string | undefined, daysOfHistory?: number): string => {
  if (cursor) {
    return cursor;
  }
  const days =
    typeof daysOfHistory === 'number' && daysOfHistory > 0
      ? Math.min(daysOfHistory, MAX_DAYS_OF_HISTORY)
      : DEFAULT_DAYS_OF_HISTORY;
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

export type FetchOptions = {
  /** Start cursor (Discord snowflake id). When set, only messages newer than this id are fetched. */
  cursor?: string;
  /** How many days of history to fetch on the first sync (when cursor is absent). Default: 30. */
  daysOfHistory?: number;
};

export type FetchResult = {
  messages: Message.Message[];
  /** Snowflake id of the newest message fetched; persist as the next cursor. */
  cursor: string | undefined;
  /** ISO-8601 timestamp of when the fetch completed. */
  fetchedAt: string;
};

/** Binding-level state that mirrors the fields written onto a `SyncBinding`. */
export type BindingState = {
  channelId: string;
  cursor: string | undefined;
  fetchedAt: string;
};

/**
 * Fixture shape produced by `generate-fixtures.ts`.
 * `state` mirrors the `SyncBinding` cursor fields; `messages` is the feed content.
 */
export type DiscordChannelFixture = {
  state: BindingState;
  messages: Message.Message[];
};

/**
 * Fetch all messages newer than `options.cursor` (or the initial lookback window)
 * from a Discord channel. Depends only on `DiscordREST`; no ECHO required.
 *
 * Suitable for tests and the fixture-generation script.
 */
export const fetchChannelMessages = (
  channelId: string,
  options?: FetchOptions,
): Effect.Effect<FetchResult, unknown, DiscordREST> =>
  Effect.gen(function* () {
    const rest = yield* DiscordREST;
    const initialAfter = computeInitialCursor(options?.cursor, options?.daysOfHistory);

    const raw: MessageResponse[] = [];
    let after = initialAfter;
    while (true) {
      const page = yield* rest.listMessages(channelId, { after, limit: MESSAGE_PAGE_LIMIT });
      if (page.length === 0) {
        break;
      }
      const sorted = [...page].sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0));
      raw.push(...sorted);
      if (sorted.length < MESSAGE_PAGE_LIMIT) {
        break;
      }
      after = sorted[sorted.length - 1].id;
    }

    const messages = raw
      .map(mapDiscordMessage)
      .filter((message): message is Message.Message => message !== undefined);

    const cursor = raw.length > 0 ? raw[raw.length - 1].id : options?.cursor;

    return { messages, cursor, fetchedAt: new Date().toISOString() };
  });
