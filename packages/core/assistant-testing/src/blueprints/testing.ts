//
// Copyright 2025 DXOS.org
//

import { Effect } from 'effect';

import { type Conversation, type ConversationRunOptions } from '@dxos/assistant';
import { log } from '@dxos/log';

export type TestStep = Pick<ConversationRunOptions<any>, 'prompt' | 'systemPrompt'> & {
  test?: () => Promise<void>;
};

/**
 * Runs the prompt steps, calling the test function after each step.
 */
export const runSteps = Effect.fn(function* ({
  conversation,
  steps,
}: {
  conversation: Conversation;
  steps: TestStep[];
}) {
  for (const { test, ...props } of steps) {
    yield* conversation.run({
      ...props,
    });

    log.info('conv', { messages: yield* Effect.promise(() => conversation.getHistory()) });
    if (test) {
      yield* Effect.promise(() => test());
    }
  }
});
