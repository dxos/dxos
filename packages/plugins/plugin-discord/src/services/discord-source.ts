//
// Copyright 2026 DXOS.org
//

import { DiscordREST } from 'dfx';
import type { GuildChannelResponse, MessageResponse, MyGuildResponse, UserResponse } from 'dfx/types';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { CrawlError, Source, type SourceApi, type ThreadRef, type Type } from '@dxos/crawler';
import { type Err, type Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { type Connection } from '@dxos/types';

import { DEFAULT_DAYS, snowflakeForTimestamp } from '../constants';
import { makeDiscordLayer, makeDiscordLayerFromToken } from './discord';

const MESSAGE_PAGE_LIMIT = 100;
const GUILD_PAGE_LIMIT = 200;
const MAX_DAYS = 365 * 3;

/** Discord message types we ingest: DEFAULT (0) and REPLY (19); everything else is a system event. */
const isContentMessage = (raw: MessageResponse): boolean => {
  const type = raw.type ?? 0;
  return type === 0 || type === 19;
};

/**
 * Resolve Discord mention markup so raw snowflake ids never reach extraction: user mentions become
 * `@displayName`, custom emoji collapse to `:name:`, and channel/role mentions (whose names aren't
 * carried on the message) are dropped. Without this the extractor treats e.g. `<#837…>` as an entity.
 */
const normalizeMentions = (content: string, mentions: ReadonlyArray<UserResponse>): string => {
  const names = new Map(mentions.map((user) => [user.id, user.global_name || user.username]));
  return content
    .replace(/<@!?(\d+)>/g, (_match, id) => `@${names.get(id) ?? 'user'}`)
    .replace(/<#\d+>/g, '')
    .replace(/<@&\d+>/g, '')
    .replace(/<a?:(\w+):\d+>/g, ':$1:')
    .replace(/ {2,}/g, ' ')
    .trim();
};

/**
 * Map a raw Discord message to a crawler message. Unlike the feed-sync path (which keeps only the
 * sender's display name), this preserves the author's stable `id` so the agent registry tokenizes by
 * user id, not name.
 */
export const mapDiscordMessage = (raw: MessageResponse): Type.Message | undefined => {
  if (!isContentMessage(raw)) {
    return undefined;
  }
  const parentId =
    (raw.type === 19
      ? (raw.referenced_message?.id ?? raw.message_reference?.message_id)
      : raw.referenced_message?.id) ?? undefined;
  const displayName =
    raw.author.global_name && raw.author.global_name.length > 0 ? raw.author.global_name : raw.author.username;
  return {
    id: raw.id,
    text: normalizeMentions(raw.content ?? '', raw.mentions ?? []),
    author: { id: raw.author.id, source: 'discord', username: raw.author.username, displayName },
    createdAt: raw.timestamp,
    ...(parentId ? { parentId } : {}),
  };
};

/** Thread sub-channels spawned by messages in a page. */
export const threadRefsOf = (raw: readonly MessageResponse[]): ThreadRef[] =>
  raw.flatMap((message) =>
    message.thread ? [{ threadId: message.thread.id, parentMessageId: message.id, name: message.thread.name }] : [],
  );

const initialCursor = (cursor: string | undefined, maxDays: number | undefined): string => {
  if (cursor) {
    return cursor;
  }
  const days = typeof maxDays === 'number' && maxDays > 0 ? Math.min(maxDays, MAX_DAYS) : DEFAULT_DAYS;
  return snowflakeForTimestamp(Date.now() - days * 24 * 60 * 60 * 1000);
};

/** Construct the Source API over an ambient DiscordREST (transport bound by the caller's layer). */
const makeSource: Effect.Effect<SourceApi, never, DiscordREST> = Effect.gen(function* () {
  const rest = yield* DiscordREST;

  const drain = (channelId: string, after: string) =>
    Effect.gen(function* () {
      const raw: MessageResponse[] = [];
      let cursor = after;
      while (true) {
        const page = yield* rest.listMessages(channelId, { after: cursor, limit: MESSAGE_PAGE_LIMIT });
        if (page.length === 0) {
          break;
        }
        // Discord returns newest-first; sort ascending so the cursor advances monotonically.
        const sorted = [...page].sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0));
        raw.push(...sorted);
        if (sorted.length < MESSAGE_PAGE_LIMIT) {
          break;
        }
        cursor = sorted[sorted.length - 1].id;
      }
      return raw;
    });

  const fetchMessages: SourceApi['fetchMessages'] = ({ channelId, threadId, cursor, maxDays }) =>
    Effect.gen(function* () {
      // Drain the thread when descending into one; otherwise the parent channel.
      const raw = yield* drain(threadId ?? channelId, initialCursor(cursor, maxDays));
      const messages = raw.map(mapDiscordMessage).filter((message): message is Type.Message => message !== undefined);
      return {
        messages,
        // Page.cursor is the newest id in this page, or undefined when nothing new was fetched.
        cursor: raw.length > 0 ? raw[raw.length - 1].id : undefined,
        threads: threadRefsOf(raw),
      };
    }).pipe(Effect.mapError((cause) => new CrawlError({ message: 'Failed to fetch Discord messages', cause })));

  const listChannels: SourceApi['listChannels'] = () =>
    Effect.gen(function* () {
      const guilds: MyGuildResponse[] = [];
      let after: string | undefined;
      while (true) {
        const guildPage = yield* rest.listMyGuilds(
          after ? { limit: GUILD_PAGE_LIMIT, after } : { limit: GUILD_PAGE_LIMIT },
        );
        guilds.push(...guildPage);
        if (guildPage.length < GUILD_PAGE_LIMIT) {
          break;
        }
        after = guildPage[guildPage.length - 1].id;
      }

      const perGuild = yield* Effect.forEach(
        guilds,
        (guild) =>
          rest.listGuildChannels(guild.id).pipe(
            Effect.map((channels) =>
              channels
                .filter((channel): channel is GuildChannelResponse => channel.type === 0 || channel.type === 5)
                .map((channel) => ({
                  id: channel.id,
                  name: channel.name ? `#${channel.name} — ${guild.name}` : `${channel.id} — ${guild.name}`,
                  guildId: guild.id,
                })),
            ),
            // A guild the bot was removed from mid-call should not fail discovery of the rest.
            Effect.catchAll((error) => {
              log.catch(error);
              return Effect.succeed([]);
            }),
          ),
        { concurrency: 4 },
      );
      return perGuild.flat();
    }).pipe(Effect.mapError((cause) => new CrawlError({ message: 'Failed to list Discord channels', cause })));

  return { listChannels, fetchMessages };
});

/**
 * Live {@link Source} over the Discord REST API, authenticated with a raw bot token (stories,
 * demo scripts, tests). `fetchMessages` drains every page newer than the cursor in one call (dfx
 * handles 429 retry + pagination); the crawler then calls again with the advanced cursor to
 * confirm the target is drained. Threads are returned as refs for the crawler to descend
 * depth-first.
 */
export const discordSourceLayer = (token: string): Layer.Layer<Source> =>
  Layer.effect(Source, makeSource).pipe(Layer.provide(makeDiscordLayerFromToken(token)));

/**
 * Live {@link Source} authenticated from a persisted {@link Connection} ref (the operation path).
 * The connection's access token is loaded at layer construction, so the handler never sees it.
 */
export const discordSourceLayerFromConnection = (
  connection: Ref.Ref<Connection.Connection>,
): Layer.Layer<Source, Err.EntityNotFoundError> =>
  Layer.effect(Source, makeSource).pipe(Layer.provide(makeDiscordLayer(connection)));
