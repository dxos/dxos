//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';

import { DiscordAdminOperation } from '#types';

import { GuildsAnswer, botQuery, callAdminRoute } from './bot.ts';

const handler: Operation.WithHandler<typeof DiscordAdminOperation.ListBotGuilds> =
  DiscordAdminOperation.ListBotGuilds.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ applicationId, accessToken }) {
        const { query } = yield* botQuery(accessToken);
        return yield* callAdminRoute(applicationId, `/guilds${query}`, { method: 'GET' }, GuildsAnswer).pipe(
          Effect.orDie,
        );
      }),
    ),
  );

export default handler;
