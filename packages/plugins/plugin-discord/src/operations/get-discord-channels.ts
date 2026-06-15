//
// Copyright 2026 DXOS.org
//

import { DiscordREST } from 'dfx';
import type { GuildChannelResponse, MyGuildResponse } from 'dfx/types';
import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { log } from '@dxos/log';

import { makeDiscordLayer } from '../services';
import { DiscordOperation } from '../types';

const GUILD_PAGE_LIMIT = 200;

/**
 * Discovery only — fetch every guild the bot belongs to, then every text /
 * announcement channel inside each guild, and return one descriptor per
 * channel.
 *
 * `name` is rendered as `#channel — guild` so the integration UI can
 * disambiguate same-named channels across multiple guilds without a separate
 * grouping concept. Failures fetching channels for one guild (e.g. the bot
 * was removed mid-call) are logged and skipped rather than failing the whole
 * discovery — every other guild remains visible.
 */
const handler: Operation.WithHandler<typeof DiscordOperation.GetDiscordChannels> =
  DiscordOperation.GetDiscordChannels.pipe(
    Operation.withHandler(
      Effect.fn(function* ({ integration }) {
        return yield* Effect.gen(function* () {
          const rest = yield* DiscordREST;

          // Drain pagination. Bots are typically in a handful of guilds so the
          // first 200-entry page covers everything; the loop is for completeness.
          const guilds: MyGuildResponse[] = [];
          let after: string | undefined;
          while (true) {
            const page = yield* rest.listMyGuilds(
              after ? { limit: GUILD_PAGE_LIMIT, after } : { limit: GUILD_PAGE_LIMIT },
            );
            guilds.push(...page);
            if (page.length < GUILD_PAGE_LIMIT) {
              break;
            }
            after = page[page.length - 1].id;
          }

          const perGuild = yield* Effect.forEach(
            guilds,
            (guild) =>
              rest.listGuildChannels(guild.id).pipe(
                // Narrow to guild text / announcement channels — the only
                // shapes we sync. `type` 0 = GUILD_TEXT, 5 = GUILD_ANNOUNCEMENT;
                // this also acts as a TS narrow to GuildChannelResponse since
                // those type values only appear on that branch of the union.
                Effect.map((channels) =>
                  channels.filter(
                    (channel): channel is GuildChannelResponse => channel.type === 0 || channel.type === 5,
                  ),
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
        }).pipe(Effect.provide(makeDiscordLayer(integration)));
      }),
    ),
  );

export default handler;
