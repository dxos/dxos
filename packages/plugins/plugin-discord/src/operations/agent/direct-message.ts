//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';

import { DiscordAgentOperation, DiscordBot } from '#types';

import { resolveAttachments } from './attachments.ts';
import { agentBot, resolveUser } from './bot.ts';

const handler: Operation.WithHandler<typeof DiscordAgentOperation.DirectMessage> =
  DiscordAgentOperation.DirectMessage.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ agent, to, text, files }) {
        const bot = yield* agentBot(agent);
        const userId = yield* resolveUser(bot, to);
        const attachments = yield* resolveAttachments(files);
        const service = yield* DiscordBot.DiscordBotService;
        const posted = yield* service.act(bot, {
          kind: 'dm',
          userId,
          text,
          ...(attachments ? { files: attachments } : {}),
        });
        return { channel: posted.channelId, message: posted.messageId };
      }, Effect.orDie),
    ),
  );

export default handler;
