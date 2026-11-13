//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import type * as Chat from '@dxos/assistant/Chat';
import * as Harness from '@dxos/assistant/Harness';
import * as Operation from '@dxos/compute/Operation';
import { type Annotation } from '@dxos/echo';
import { type Message } from '@dxos/types';
import { safeParseJson } from '@dxos/util';

import { ConversationSkill } from '#skills';
import { AgentChannels } from '#types';

/** The follow-up; the hook also recognizes it in the history, so it fires at most once per request. */
export const REMINDER =
  "Your reply was not sent: in a channel conversation your text goes nowhere. Send it with the channel's tool, " +
  'or, to stay silent on purpose, finish without writing anything.';

/**
 * Deterministic, with no model call: since the request's prompt the agent wrote text, and no
 * {@link AgentChannels.ChannelSendAnnotation channel send} reported posting in this conversation. Which calls were
 * channel sends is read from the annotations the history recorded with each call, not from the operations' handlers,
 * so the hook decides alike where every plugin is loaded and in plugin-agent's own EDGE bundle.
 */
const handler: Operation.WithHandler<typeof ConversationSkill.EnsureReplySent> = ConversationSkill.EnsureReplySent.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* () {
      const chat = yield* Harness.getChat.pipe(Effect.orElseSucceed(() => undefined));
      const conversation = chat && AgentChannels.conversationOf(chat);
      if (!chat || !conversation) {
        return {};
      }

      const history = yield* Harness.history.pipe(Effect.orElseSucceed((): Message.Message[] => []));
      const request = history.slice(history.findLastIndex(isPrompt) + 1);
      const wrote = request.some((message) => message.sender.role === 'assistant' && textOf(message).length > 0);
      const reminded = request.some((message) => textOf(message, true).includes(REMINDER));
      if (!wrote || reminded) {
        return {};
      }

      const replied = succeededCalls(request).some(({ annotations, output, evaluated }) => {
        const field = AgentChannels.channelSendField(annotations);
        // Code mode does not record where a send from an `eval` went, so any such send counts as the reply.
        return field !== undefined && (evaluated || isConversation(output?.[field], chat, conversation.thread));
      });
      return replied ? {} : { followUp: REMINDER };
    }),
  ),
);

export default handler;

/** A prompt someone wrote, which starts a request; synthetic prompts (a hook's follow-up) continue one. */
const isPrompt = (message: Message.Message): boolean => message.sender.role === 'user' && textOf(message).length > 0;

/**
 * The request's operation calls that returned a result rather than an error, with their operation's recorded
 * annotations and decoded output: each tool call, and each operation a code-mode `eval` ran, which is recorded without
 * its output.
 */
const succeededCalls = (
  request: readonly Message.Message[],
): {
  annotations: Annotation.Dictionary | undefined;
  output: Record<string, unknown> | undefined;
  evaluated: boolean;
}[] => {
  const blocks = request.flatMap((message) => message.blocks);
  const outputs = new Map(
    blocks.flatMap((block) =>
      block._tag === 'toolResult' && block.error === undefined
        ? [
            [
              block.toolCallId,
              typeof block.result === 'string' ? safeParseJson<Record<string, unknown>>(block.result) : undefined,
            ] as const,
          ]
        : [],
    ),
  );
  const calls = blocks.flatMap((block) =>
    block._tag === 'toolCall' && block.operationKey && outputs.has(block.toolCallId)
      ? [{ annotations: block.operationAnnotations, output: outputs.get(block.toolCallId), evaluated: false }]
      : [],
  );
  // A code-mode `eval` is one call that may run several operations; its result records which.
  const evaluated = blocks.flatMap((block) =>
    block._tag === 'toolResult'
      ? (block.invocations ?? []).flatMap(({ annotations, error }) =>
          error === undefined ? [{ annotations, output: undefined, evaluated: true }] : [],
        )
      : [],
  );
  return [...calls, ...evaluated];
};

/** Whether a send's destination is this conversation: its thread id, or an encoded reference to its chat. */
const isConversation = (destination: unknown, chat: Chat.Chat, thread: string | undefined): boolean => {
  if (typeof destination === 'string') {
    return destination === thread;
  }
  const target =
    typeof destination === 'object' && destination !== null && '/' in destination ? destination['/'] : undefined;
  return typeof target === 'string' && target.endsWith(chat.id);
};

/** The message's finished text: what its author wrote, or with `synthetic` what the system wrote. */
const textOf = (message: Message.Message, synthetic = false): string[] =>
  message.blocks.flatMap((block) =>
    block._tag === 'text' &&
    !block.pending &&
    block.disposition !== 'cot' &&
    (block.disposition === 'synthetic') === synthetic &&
    block.text.trim().length > 0
      ? [block.text.trim()]
      : [],
  );
