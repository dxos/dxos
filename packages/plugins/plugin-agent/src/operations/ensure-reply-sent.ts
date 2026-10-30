//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Harness from '@dxos/assistant/Harness';
import * as Operation from '@dxos/compute/Operation';
import { type Message } from '@dxos/types';

import { ConversationSkill } from '#skills';
import { AgentChannels } from '#types';

/** The follow-up; the hook also recognizes it in the history, so it fires at most once per request. */
export const REMINDER =
  "Your reply was not sent: in a channel conversation your text goes nowhere. Send it with the channel's tool, " +
  'or, to stay silent on purpose, finish without writing anything.';

/**
 * Deterministic, with no model call: the agent wrote text since the request's prompt and sent nothing, judged by the
 * same marks the channel's host posts by ({@link AgentChannels.isSent}).
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
      const reminded = request.some((message) => textOf(message, true).includes(REMINDER));
      const unsent =
        request.some((message) => message.sender.role === 'assistant' && textOf(message).length > 0) &&
        !request.some(AgentChannels.isSent);
      return unsent && !reminded ? { followUp: REMINDER } : {};
    }),
  ),
);

export default handler;

/** A prompt someone wrote, which starts a request; synthetic prompts (a hook's follow-up) continue one. */
const isPrompt = (message: Message.Message): boolean => message.sender.role === 'user' && textOf(message).length > 0;

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
