//
// Copyright 2026 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Operation } from '@dxos/compute';
import { log } from '@dxos/log';

import { DiscordApi, makeEdgeProxyHttpClientLayer } from '../services';
import { DiscordOperation } from '../types';

/**
 * Discovery only — fetch every guild the bot belongs to, then every text
 * channel inside each guild, and return one descriptor per channel.
 *
 * `name` is rendered as `#channel — guild` so the integration UI can
 * disambiguate same-named channels across multiple guilds without a separate
 * grouping concept. Failures fetching channels for one guild (e.g. the bot
 * was removed mid-call) are logged and skipped rather than failing the whole
 * discovery — every other guild remains visible.
 */
const handler: Operation.WithHandler<typeof DiscordOperation.GetDiscordChannels> = DiscordOperation.GetDiscordChannels.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ integration }) {
      return yield* Effect.gen(function* () {
        const guilds = yield* DiscordApi.fetchGuilds();
        const perGuild = yield* Effect.forEach(
          guilds,
          (guild) =>
            DiscordApi.fetchGuildChannels(guild.id).pipe(
              Effect.map((channels) =>
                channels
                  .filter((channel) => DiscordApi.SYNCABLE_CHANNEL_TYPES.has(channel.type))
                  .map((channel) => ({
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
      }).pipe(
        Effect.provide(DiscordApi.DiscordCredentials.fromIntegration(integration)),
        Effect.provide(FetchHttpClient.layer.pipe(Layer.provide(makeEdgeProxyHttpClientLayer()))),
      );
    }),
  ),
);

export default handler;
