//
// Copyright 2026 DXOS.org
//

import { DiscordREST } from 'dfx';
import type { GuildChannelResponse, MessageResponse, MyGuildResponse } from 'dfx/types';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { CrawlError, Source, type SourceApi, type Type } from '@dxos/crawler';
import { log } from '@dxos/log';

import { DiscordService } from '#types';

import { mapDiscordMessage, snowflakeForTimestamp, threadRefsOf } from './discord-message.ts';
import { makeDiscordLayerFromToken } from './discord.ts';

const MESSAGE_PAGE_LIMIT = 100;
const GUILD_PAGE_LIMIT = 200;
const MAX_DAYS = 365 * 3;

/** Where a target with no cursor starts: `maxDays` back, or its whole history when unset. */
const initialCursor = (cursor: string | undefined, maxDays: number | undefined): string => {
  if (cursor) {
    return cursor;
  }
  return typeof maxDays === 'number' && maxDays > 0
    ? snowflakeForTimestamp(Date.now() - Math.min(maxDays, MAX_DAYS) * 24 * 60 * 60 * 1000)
    : '0';
};

export type SourceOptions = {
  /**
   * Messages one `fetchMessages` call returns at most: a single Discord request for the oldest messages after the
   * cursor, so a bounded crawl step costs a bounded request and extraction. Unset drains every page in one call.
   */
  readonly pageLimit?: number;
};

/** Snowflakes compare as numbers: as strings, an id with fewer digits sorts after a newer, longer one. */
const byId = (left: { readonly id: string }, right: { readonly id: string }) => {
  const [a, b] = [BigInt(left.id), BigInt(right.id)];
  return a < b ? -1 : a > b ? 1 : 0;
};

/** Construct the Source API over an ambient DiscordREST (transport bound by the caller's layer). */
const makeSource = (options: SourceOptions = {}): Effect.Effect<SourceApi, never, DiscordREST> =>
  Effect.gen(function* () {
    const rest = yield* DiscordREST;

    const drain = (channelId: string, after: string) =>
      Effect.gen(function* () {
        if (options.pageLimit !== undefined) {
          const limit = Math.max(1, Math.min(options.pageLimit, MESSAGE_PAGE_LIMIT));
          // Discord returns newest-first; sort ascending so the cursor advances monotonically.
          return [...(yield* rest.listMessages(channelId, { after, limit }))].sort(byId);
        }
        const raw: MessageResponse[] = [];
        let cursor = after;
        while (true) {
          const page = yield* rest.listMessages(channelId, { after: cursor, limit: MESSAGE_PAGE_LIMIT });
          if (page.length === 0) {
            break;
          }
          const sorted = [...page].sort(byId);
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
export const discordSourceLayer = (token: string, options?: SourceOptions): Layer.Layer<Source> =>
  Layer.effect(Source, makeSource(options)).pipe(Layer.provide(makeDiscordLayerFromToken(token)));

/**
 * Live {@link Source} that reads as a bot through {@link DiscordService.DiscordService}, whose host holds the bot's
 * token and answers only channels and messages of the servers the space connected: the back-index's source.
 */
export const discordSourceLayerFromService = (
  bot: DiscordService.Bot,
  options: SourceOptions = {},
): Layer.Layer<Source, never, DiscordService.DiscordService> =>
  Layer.effect(
    Source,
    Effect.gen(function* () {
      const service = yield* DiscordService.DiscordService;

      const drain = Effect.fnUntraced(function* (channelId: string, after: string) {
        if (options.pageLimit !== undefined) {
          const limit = Math.max(1, Math.min(options.pageLimit, MESSAGE_PAGE_LIMIT));
          return [...(yield* service.fetchMessages(bot, { channelId, after, limit }))].sort(byId);
        }
        const raw: DiscordService.Message[] = [];
        let cursor = after;
        while (true) {
          const page = [
            ...(yield* service.fetchMessages(bot, { channelId, after: cursor, limit: MESSAGE_PAGE_LIMIT })),
          ].sort(byId);
          raw.push(...page);
          if (page.length < MESSAGE_PAGE_LIMIT) {
            return raw;
          }
          cursor = page[page.length - 1].id;
        }
      });

      const fetchMessages: SourceApi['fetchMessages'] = ({ channelId, threadId, cursor, maxDays }) =>
        drain(threadId ?? channelId, initialCursor(cursor, maxDays)).pipe(
          Effect.map((raw) => ({
            messages: raw.map(mapDiscordMessage).filter((message): message is Type.Message => message !== undefined),
            cursor: raw.length > 0 ? raw[raw.length - 1].id : undefined,
            threads: threadRefsOf(raw),
          })),
          Effect.mapError(
            (cause) => new CrawlError({ message: `Failed to fetch Discord messages: ${cause.message}`, cause }),
          ),
        );

      const listChannels: SourceApi['listChannels'] = () =>
        service.listChannels(bot).pipe(
          Effect.map((channels) =>
            channels.map(({ id, name, guildId, guildName }) => ({ id, name: `#${name} — ${guildName}`, guildId })),
          ),
          Effect.mapError((cause) => new CrawlError({ message: 'Failed to list Discord channels', cause })),
        );

      return { listChannels, fetchMessages } satisfies SourceApi;
    }),
  );
