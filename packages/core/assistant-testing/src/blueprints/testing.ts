//
// Copyright 2025 DXOS.org
//

import { type AiTool, AiToolkit } from '@effect/ai';
import { Effect } from 'effect';

import { type AiConversation, type AiConversationRunParams } from '@dxos/assistant';
import { log } from '@dxos/log';

export type TestStep = Pick<AiConversationRunParams<any>, 'prompt' | 'system'> & {
  test?: () => Promise<void>;
};

/**
 * Runs the prompt steps, calling the test function after each step.
 */
export const runSteps = Effect.fn(function* ({
  conversation,
  steps,
}: {
  conversation: AiConversation;
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

// TODO(wittjosiah): Don't cast.
export const testToolkit = AiToolkit.make() as AiToolkit.Any as AiToolkit.AiToolkit<AiTool.Any>;
