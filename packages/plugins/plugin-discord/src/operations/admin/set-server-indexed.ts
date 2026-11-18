//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';
import { Connection } from '@dxos/link';

import { DiscordAdminOperation } from '#types';

import { callAdminRoute } from './bot.ts';

const GrantsAnswer = Schema.Struct({ guildIds: Schema.Array(Schema.String) });

const handler: Operation.WithHandler<typeof DiscordAdminOperation.SetServerIndexed> =
  DiscordAdminOperation.SetServerIndexed.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ applicationId, guildId, indexed, connection: connectionRef }) {
        const { db } = yield* Database.Service;
        const route = `/guilds/${encodeURIComponent(guildId)}/index`;
        if (!indexed) {
          return yield* callAdminRoute(
            applicationId,
            `${route}?${new URLSearchParams({ spaceId: db.spaceId }).toString()}`,
            { method: 'DELETE' },
            GrantsAnswer,
          ).pipe(Effect.orDie);
        }
        // EDGE reads the person's Discord token from the space by id to check they manage the server.
        const connection = yield* Database.load(connectionRef).pipe(Effect.orDie);
        const userToken = yield* Database.load(Connection.getAccessToken(connection)).pipe(Effect.orDie);
        return yield* callAdminRoute(
          applicationId,
          route,
          { method: 'PUT', body: { spaceId: db.spaceId, userTokenId: userToken.id } },
          GrantsAnswer,
        ).pipe(Effect.orDie);
      }),
    ),
  );

export default handler;
