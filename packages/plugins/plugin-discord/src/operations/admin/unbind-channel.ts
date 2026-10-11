//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import * as Operation from '@dxos/compute/Operation';
import { Database, Filter, Obj } from '@dxos/echo';

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
        for (const config of configs) {
          if (config.applicationId === applicationId && config.channels.includes(discordChannelId)) {
            Obj.update(config, (config) => {
              config.channels = config.channels.filter((id) => id !== discordChannelId);
            });
          }
        }
        return {};
      }),
    ),
  );

export default handler;
