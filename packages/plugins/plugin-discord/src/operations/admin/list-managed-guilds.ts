//
// Copyright 2026 DXOS.org
//

import { DiscordREST } from 'dfx';
import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';

import { DiscordAdminOperation } from '#types';

import { makeDiscordUserLayer } from '../../services/index.ts';

/** Discord's Manage Server permission bit. */
const MANAGE_GUILD = 1n << 5n;

const handler: Operation.WithHandler<typeof DiscordAdminOperation.ListManagedGuilds> =
  DiscordAdminOperation.ListManagedGuilds.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ connection }) {
        const guilds = yield* Effect.gen(function* () {
          const rest = yield* DiscordREST;
          return yield* rest.listMyGuilds({ limit: 200 });
        }).pipe(Effect.provide(makeDiscordUserLayer(connection)), Effect.orDie);
        return {
          guilds: guilds
            .filter(({ owner, permissions }) => owner || (BigInt(permissions ?? '0') & MANAGE_GUILD) !== 0n)
            .map(({ id, name, icon }) => ({ id, name, ...(icon ? { icon } : {}) })),
        };
      }),
    ),
  );

export default handler;
