//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';

import { DiscordAgentOperation, DiscordBot } from '#types';

import { agentBot } from './bot.ts';

const handler: Operation.WithHandler<typeof DiscordAgentOperation.React> = DiscordAgentOperation.React.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ agent, channel, message, emoji }) {
      const bot = yield* agentBot(agent);
      const service = yield* DiscordBot.DiscordBotService;
      const reacted = yield* service.act(bot, { kind: 'react', channelId: channel, messageId: message, emoji });
      return { channel: reacted.channelId };
    }, Effect.orDie),
  ),
);

export default handler;
