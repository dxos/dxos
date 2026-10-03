//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';

import { DiscordOperation } from '#types';

import { callBot, resolveBotTarget } from './discord-bot.ts';

const handler: Operation.WithHandler<typeof DiscordOperation.GetBotStatus> = DiscordOperation.GetBotStatus.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ binding }) {
      const target = yield* resolveBotTarget(binding);
      const status = yield* callBot(target.applicationId, { method: 'GET' });
      return { status };
    }),
  ),
);

export default handler;
