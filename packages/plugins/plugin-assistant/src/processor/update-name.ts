//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Fiber from 'effect/Fiber';
import * as Runtime from 'effect/Runtime';

import { AiService, DEFAULT_EDGE_MODEL, type ModelName } from '@dxos/ai';
import { type AiConversation, AiSession } from '@dxos/assistant';
import { throwCause } from '@dxos/effect';
import { trim } from '@dxos/util';

import { type Assistant } from '../types';

import { type AiChatServices } from './processor';

/**
 * Update the current chat's name.
 */
// TODO(burdon): Convert this into a plugin tool.
export const updateName = async (
  runtime: Runtime.Runtime<AiChatServices>,
  conversation: AiConversation,
  chat: Assistant.Chat,
  // TODO(burdon): Use simpler model.
  model: ModelName = DEFAULT_EDGE_MODEL,
): Promise<void> => {
  const history = await conversation.getHistory();
  const system = trim`
    It is extremely important that you respond only with the title and nothing else.
    If you cannot do this effectively respond with "New Chat".
  `;
  const prompt = 'Suggest a name for this chat';

  const fiber = Effect.gen(this, function* () {
    const session = new AiSession();
    return yield* session.run({ system, prompt, history });
  }).pipe(
    Effect.provide(AiService.model(model)),
    Effect.tap((messages) => {
      // TODO(burdon): Parse response (should update via tool).
      const message = messages.find((message) => message.sender.role === 'assistant');
      const title = message?.blocks.find((block) => block._tag === 'text')?.text;
      if (title) {
        chat.name = title;
      }
    }),
    Runtime.runFork(runtime), // Run in the background.
  );

  const response = await fiber.pipe(Fiber.join, Effect.runPromiseExit);
  if (!Exit.isSuccess(response)) {
    throwCause(response.cause);
  }
};
