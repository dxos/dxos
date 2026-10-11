//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import * as Operation from '@dxos/compute/Operation';
import { Database, Filter, Obj } from '@dxos/echo';
import { EID } from '@dxos/keys';
import * as AgentChannels from '@dxos/plugin-agent/AgentChannels';
import { Channel } from '@dxos/types';

import { DiscordAdminOperation, DiscordChannel } from '#types';

import { botQuery, callAdminRoute } from './bot.ts';

const handler: Operation.WithHandler<typeof DiscordAdminOperation.UnbindChannel> =
  DiscordAdminOperation.UnbindChannel.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ applicationId, discordChannelId }) {
        const { query } = yield* botQuery();
        yield* callAdminRoute(
          applicationId,
          `/bindings/${encodeURIComponent(discordChannelId)}${query}`,
          { method: 'DELETE' },
          Schema.Unknown,
        ).pipe(Effect.orDie);

        // The config's channel list is what a later start re-binds, so the id leaves it too.
        const configs = yield* Database.query(Filter.type(DiscordChannel.DiscordChannel)).run.pipe(Effect.orDie);
        const emptied = new Set<string>();
        for (const config of configs) {
          if (config.applicationId === applicationId && config.channels.includes(discordChannelId)) {
            Obj.update(config, (config) => {
              config.channels = config.channels.filter((id) => id !== discordChannelId);
            });
            if (config.channels.length === 0) {
              emptied.add(config.id);
            }
          }
        }

        // A `Channel` left with no Discord channel names nothing, so it leaves the agents' lists; its conversations stay.
        const channels = yield* Database.query(Filter.type(Channel.Channel)).run.pipe(Effect.orDie);
        const orphans = channels.filter((channel) => emptied.has(entityIdOf(channel.backend.config.uri) ?? ''));
        if (orphans.length > 0) {
          const orphanIds = new Set(orphans.map(({ id }) => id));
          const lists = yield* Database.query(Filter.type(AgentChannels.AgentChannels)).run.pipe(Effect.orDie);
          for (const list of lists) {
            if (list.channels.some((ref) => orphanIds.has(entityIdOf(ref.uri) ?? ''))) {
              Obj.update(list, (list) => {
                list.channels = list.channels.filter((ref) => !orphanIds.has(entityIdOf(ref.uri) ?? ''));
              });
            }
          }
        }
        return {};
      }),
    ),
  );

export default handler;

/** The object id a ref URI names, whatever its space qualification. */
const entityIdOf = (uri: string): string | undefined => {
  const eid = EID.parse(uri);
  return eid ? EID.getEntityId(eid) : undefined;
};
