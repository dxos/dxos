//
// Copyright 2026 DXOS.org
//

import * as HttpClient from '@effect/platform/HttpClient';
import * as HttpClientRequest from '@effect/platform/HttpClientRequest';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Operation } from '@dxos/compute';
import { log } from '@dxos/log';

import { DISCORD_API_BASE } from '../constants';
import { makeDiscordUserLayer } from '../services';
import { DiscordOperation } from '../types';

const GUILD_PAGE_LIMIT = 200;

/** Wire shapes for Discord REST responses (subset of fields used here). */
const GuildResponse = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
});

const ChannelResponse = Schema.Struct({
  id: Schema.String,
  type: Schema.Number,
  name: Schema.NullOr(Schema.String).pipe(Schema.optional),
  topic: Schema.NullOr(Schema.String).pipe(Schema.optional),
  parent_id: Schema.NullOr(Schema.String).pipe(Schema.optional),
  nsfw: Schema.Boolean.pipe(Schema.optional),
});

/**
 * Fetch all guilds the user belongs to, then all text channels per guild,
 * and return one descriptor per channel in the same shape as the bot's
 * `GetDiscordChannels` handler so `SyncDiscordChannel` can sync them
 * without modification.
 */
const handler: Operation.WithHandler<typeof DiscordOperation.GetDiscordUserChannels> =
  DiscordOperation.GetDiscordUserChannels.pipe(
    Operation.withHandler(
      Effect.fn(function* ({ integration }) {
        return yield* Effect.gen(function* () {
          const httpClient = yield* HttpClient.HttpClient;

          const getJson = <A, I>(url: string, schema: Schema.Schema<A, I>) =>
            HttpClientRequest.get(`${DISCORD_API_BASE}${url}`).pipe(
              httpClient.execute,
              Effect.flatMap((res) => res.json),
              Effect.flatMap(Schema.decodeUnknown(schema)),
              Effect.scoped,
            );

          // Drain paginated guild list.
          const guilds: Schema.Schema.Type<typeof GuildResponse>[] = [];
          let after: string | undefined;
          while (true) {
            const params = new URLSearchParams({ limit: String(GUILD_PAGE_LIMIT) });
            if (after) {
              params.set('after', after);
            }
            const page = yield* getJson(`/users/@me/guilds?${params.toString()}`, Schema.Array(GuildResponse));
            guilds.push(...page);
            if (page.length < GUILD_PAGE_LIMIT) {
              break;
            }
            after = page[page.length - 1].id;
          }

          const perGuild = yield* Effect.forEach(
            guilds,
            (guild) =>
              getJson(`/guilds/${guild.id}/channels`, Schema.Array(ChannelResponse)).pipe(
                Effect.map((channels) =>
                  channels.filter((channel) => channel.type === 0 || channel.type === 5),
                ),
                Effect.map((channels) =>
                  channels.map((channel) => ({
                    id: channel.id,
                    name: channel.name ? `#${channel.name} — ${guild.name}` : `${channel.id} — ${guild.name}`,
                    description: channel.topic ?? undefined,
                    metadata: {
                      guildId: guild.id,
                      guildName: guild.name,
                      channelType: channel.type,
                      parentId: channel.parent_id ?? undefined,
                      nsfw: channel.nsfw ?? false,
                    },
                  })),
                ),
                Effect.catchAll((error) => {
                  log.catch(error);
                  return Effect.succeed([]);
                }),
              ),
            { concurrency: 4 },
          );

          return { targets: perGuild.flat() };
        }).pipe(Effect.provide(makeDiscordUserLayer(integration)));
      }),
    ),
  );

export default handler;
