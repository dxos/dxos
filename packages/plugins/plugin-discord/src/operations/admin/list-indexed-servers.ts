//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';

import { DiscordAdminOperation } from '#types';

import { callAdminRoute } from './bot.ts';

const GrantsAnswer = Schema.Struct({ guildIds: Schema.Array(Schema.String) });

const handler: Operation.WithHandler<typeof DiscordAdminOperation.ListIndexedServers> =
  DiscordAdminOperation.ListIndexedServers.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ applicationId }) {
        const { db } = yield* Database.Service;
        return yield* callAdminRoute(
          applicationId,
          `/index?${new URLSearchParams({ spaceId: db.spaceId }).toString()}`,
          { method: 'GET' },
          GrantsAnswer,
        ).pipe(Effect.orDie);
      }),
    ),
  );

export default handler;
