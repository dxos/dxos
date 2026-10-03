//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';

import { DiscordOperation } from '#types';

import { sendDiscord } from './discord-rest.ts';

const handler: Operation.WithHandler<typeof DiscordOperation.SendMessage> = DiscordOperation.SendMessage.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const { delivered, channelId, messageIds, reason } = yield* sendDiscord(input);
      return { delivered, channelId, messageIds, reason };
    }),
  ),
);

export default handler;
