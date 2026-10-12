//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';

import { DiscordAdminOperation } from '#types';

import { ChannelsAnswer, botQuery, callAdminRoute } from './bot.ts';

const handler: Operation.WithHandler<typeof DiscordAdminOperation.ListGuildChannels> =
  DiscordAdminOperation.ListGuildChannels.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ applicationId, accessToken, guildId }) {
        const { query } = yield* botQuery(accessToken);
        return yield* callAdminRoute(
          applicationId,
          `/guilds/${encodeURIComponent(guildId)}/channels${query}`,
          { method: 'GET' },
          ChannelsAnswer,
        ).pipe(Effect.orDie);
      }),
    ),
  );

export default handler;
