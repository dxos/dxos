//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';

import { DiscordAdminOperation } from '#types';

import { BindingsAnswer, botQuery, callAdminRoute } from './bot.ts';

const handler: Operation.WithHandler<typeof DiscordAdminOperation.ListBindings> =
  DiscordAdminOperation.ListBindings.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ applicationId }) {
        const { query } = yield* botQuery();
        return yield* callAdminRoute(applicationId, `/bindings${query}`, { method: 'GET' }, BindingsAnswer).pipe(
          Effect.orDie,
        );
      }),
    ),
  );

export default handler;
