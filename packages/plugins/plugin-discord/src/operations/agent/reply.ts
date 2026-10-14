//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';

import { DiscordAgentOperation, DiscordBot } from '#types';

import { agentBot } from './bot.ts';

const handler: Operation.WithHandler<typeof DiscordAgentOperation.Reply> = DiscordAgentOperation.Reply.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ agent, channel, text, replyTo }) {
      const bot = yield* agentBot(agent);
      const service = yield* DiscordBot.DiscordBotService;
      const posted = yield* service.act(bot, { kind: 'post', channelId: channel, text, replyTo });
      return { channel: posted.channelId, message: posted.messageId };
    }, Effect.orDie),
  ),
);

export default handler;
