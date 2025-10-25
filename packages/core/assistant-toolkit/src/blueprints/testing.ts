//
// Copyright 2025 DXOS.org
//

import * as Toolkit from '@effect/ai/Toolkit';
import * as Effect from 'effect/Effect';

import { ConsolePrinter } from '@dxos/ai';
import { type AiConversation, type AiConversationRunParams, GenerationObserver } from '@dxos/assistant';
import { log } from '@dxos/log';

export type TestStep = Pick<AiConversationRunParams, 'prompt' | 'system'> & {
  test?: () => Promise<void>;
};

/**
 * Runs the prompt steps, calling the test function after each step.
 */
export const runSteps = Effect.fn(function* (conversation: AiConversation, steps: TestStep[]) {
  for (const { test, ...props } of steps) {
    yield* conversation.createRequest({
      ...props,
      observer: GenerationObserver.fromPrinter(new ConsolePrinter({ mode: 'json' })),
    });
    const messages = yield* Effect.promise(() => conversation.getHistory());
    log.info('conversation', { messages });
    if (test) {
      yield* Effect.promise(() => test());
    }
  }
});

// TODO(wittjosiah): Don't cast.
export const testToolkit = Toolkit.empty as Toolkit.Toolkit<any>;
