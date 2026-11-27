//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import * as AgentOperation from '@dxos/plugin-agent/AgentOperation';

import { DiscordAgentOperation, DiscordBot } from '#types';

import { resolveAttachments } from './attachments.ts';
import { agentDiscordChannel, resolveUser } from './bot.ts';

const handler: Operation.WithHandler<typeof DiscordAgentOperation.DirectMessage> =
  DiscordAgentOperation.DirectMessage.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ agent, to, text, files }) {
        const { bot, channel } = yield* agentDiscordChannel(agent);
        const userId = yield* resolveUser(bot, to);
        const attachments = yield* resolveAttachments(files);
        const service = yield* DiscordBot.DiscordBotService;
        const posted = yield* service.act(bot, {
          kind: 'dm',
          userId,
          text,
          ...(attachments ? { files: attachments } : {}),
        });
        // The agent owns the DM's chat: it records what it sent there, keyed by the DM channel the post opened, so the
        // person's answer reads in context (EDGE's bot only carries the message). The DM is already out, so a failed record
        // is logged rather than failing the send, which the caller would retry as a second DM.
        yield* Operation.invoke(AgentOperation.RecordChannelSend, {
          agent,
          channel: Ref.make(channel),
          thread: posted.channelId,
          text: withAttachmentNote(text, attachments ?? []),
          properties: {
            discord: { channelId: posted.channelId, ...(posted.messageId ? { messageId: posted.messageId } : {}) },
          },
        }).pipe(Effect.catchCause((cause) => Effect.sync(() => log.warn('recording the sent DM failed', { cause }))));
        return { channel: posted.channelId, message: posted.messageId };
      }, Effect.orDie),
    ),
  );

/** The text as the DM's chat records it: the files are named, so the agent reading the chat knows what was sent. */
const withAttachmentNote = (text: string, files: readonly DiscordBot.Attachment[]) =>
  files.length === 0
    ? text
    : [text.trim(), `[attached: ${files.map(({ name }) => name).join(', ')}]`].filter(Boolean).join('\n');

export default handler;
