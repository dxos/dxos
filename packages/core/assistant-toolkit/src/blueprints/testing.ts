//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { ConsolePrinter } from '@dxos/ai';
import {
  AiContextService,
  type AiConversation,
  type AiConversationRunProps,
  GenerationObserver,
} from '@dxos/assistant';
import { log } from '@dxos/log';
import { type AppCapabilities } from '@dxos/app-toolkit';
import { pipe } from 'effect';
import { BrowserBlueprint } from './browser';
import * as Array from 'effect/Array';
import { Database, Ref } from '@dxos/echo';

export type TestStep = Pick<AiConversationRunProps, 'prompt' | 'system'> & {
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

/**
 * Binds blueprints from the blueprint definitions.
 */
// TODO(dmaretskyi): Potentially the agent will auto-bind the blueprints.
export const addBlueprints = Effect.fnUntraced(function* (blueprints: AppCapabilities.BlueprintDefinition[]) {
  yield* AiContextService.bindContext({
    blueprints: yield* pipe(
      blueprints,
      Array.map((_) => _.make()),
      Effect.forEach(Database.add),
      Effect.map(Array.map(Ref.make)),
    ),
  });
});
