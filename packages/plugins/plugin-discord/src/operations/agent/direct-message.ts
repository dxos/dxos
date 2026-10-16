//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';

import { DiscordAgentOperation, DiscordBot } from '#types';

import { agentBot, resolveUser } from './bot.ts';

const handler: Operation.WithHandler<typeof DiscordAgentOperation.DirectMessage> =
  DiscordAgentOperation.DirectMessage.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ agent, to, text }) {
        const bot = yield* agentBot(agent);
        const userId = yield* resolveUser(bot, to);
        const service = yield* DiscordBot.DiscordBotService;
        const posted = yield* service.act(bot, { kind: 'dm', userId, text });
        return { channel: posted.channelId, message: posted.messageId };
      }, Effect.orDie),
    ),
  );

export default handler;
