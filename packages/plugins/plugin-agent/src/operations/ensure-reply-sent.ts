//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Harness from '@dxos/assistant/Harness';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import { type Message } from '@dxos/types';

import { ConversationSkill } from '#skills';
import { AgentChannels } from '#types';

/** The follow-up; the hook also recognizes it in the history, so it fires at most once per request. */
export const REMINDER =
  "Your reply was not sent: in a channel conversation your text goes nowhere. Send it with the channel's tool, " +
  'or, to stay silent on purpose, finish without writing anything.';

/**
 * Deterministic, with no model call: since the request's prompt the agent wrote text, and no call to a
 * {@link AgentChannels.isChannelSend channel send} succeeded.
 */
const handler: Operation.WithHandler<typeof ConversationSkill.EnsureReplySent> = ConversationSkill.EnsureReplySent.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* () {
      const chat = yield* Harness.getChat.pipe(Effect.orElseSucceed(() => undefined));
      if (!chat || !AgentChannels.conversationOf(chat)) {
        return {};
      }

      const history = yield* Harness.history.pipe(Effect.orElseSucceed((): Message.Message[] => []));
      const request = history.slice(history.findLastIndex(isPrompt) + 1);
      const wrote = request.some((message) => message.sender.role === 'assistant' && textOf(message).length > 0);
      const reminded = request.some((message) => textOf(message, true).includes(REMINDER));
      if (!wrote || reminded) {
        return {};
      }

      const handlers = yield* OperationHandlerSet.OperationHandlerProvider;
      const sends = yield* Effect.forEach(succeededOperations(request), (key) =>
        OperationHandlerSet.getHandlerByKey(handlers, key).pipe(
          Effect.map(AgentChannels.isChannelSend),
          Effect.orElseSucceed(() => false),
        ),
      );
      return sends.some(Boolean) ? {} : { followUp: REMINDER };
    }),
  ),
);

export default handler;

/** A prompt someone wrote, which starts a request; synthetic prompts (a hook's follow-up) continue one. */
const isPrompt = (message: Message.Message): boolean => message.sender.role === 'user' && textOf(message).length > 0;

/** Keys of the operations behind the request's tool calls that returned a result rather than an error. */
const succeededOperations = (request: readonly Message.Message[]): string[] => {
  const blocks = request.flatMap((message) => message.blocks);
  const succeeded = new Set(
    blocks.flatMap((block) => (block._tag === 'toolResult' && block.error === undefined ? [block.toolCallId] : [])),
  );
  const keys = blocks.flatMap((block) =>
    block._tag === 'toolCall' && block.operationKey && succeeded.has(block.toolCallId) ? [block.operationKey] : [],
  );
  return [...new Set(keys)];
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
