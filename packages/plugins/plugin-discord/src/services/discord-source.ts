//
// Copyright 2026 DXOS.org
//

import { DiscordREST } from 'dfx';
import type { GuildChannelResponse, MessageResponse, MyGuildResponse } from 'dfx/types';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import * as Credential from '@dxos/compute/Credential';
import { CrawlError, Source, type SourceApi, type Type } from '@dxos/crawler';
import { type Error, type Ref } from '@dxos/echo';
import { Connection } from '@dxos/link';
import { log } from '@dxos/log';

import { DEFAULT_DAYS } from '../constants.ts';
import { mapDiscordMessage, snowflakeForTimestamp, threadRefsOf } from './discord-message.ts';
import { makeDiscordLayer, makeDiscordLayerFromToken } from './discord.ts';

const MESSAGE_PAGE_LIMIT = 100;
const GUILD_PAGE_LIMIT = 200;
const MAX_DAYS = 365 * 3;

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
            Effect.catch((error) => {
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
 * The connection's token is resolved at layer construction, so the handler never sees it.
 */
export const discordSourceLayerFromConnection = (
  connection: Ref.Ref<Connection.Connection>,
): Layer.Layer<Source, Error.EntityNotFoundError, Credential.CredentialsService> =>
  Layer.effect(Source, makeSource).pipe(Layer.provide(makeDiscordLayer(connection)));
