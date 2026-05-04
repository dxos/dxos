//
// Copyright 2025 DXOS.org
//

import * as Arr from 'effect/Array';
import * as Effect from 'effect/Effect';
import { pipe } from 'effect/Function';

import { ConsolePrinter } from '@dxos/ai';
import { AiContextService, type AiSession, type AiSessionRunProps, GenerationObserver } from '@dxos/assistant';
import type { Definition } from '@dxos/compute';
import { Database, Ref } from '@dxos/echo';
import { log } from '@dxos/log';

export type TestStep = Pick<AiSessionRunProps, 'prompt' | 'system'> & {
  test?: () => Promise<void>;
};

/**
 * Runs the prompt steps, calling the test function after each step.
 */
export const runSteps = Effect.fn(function* (session: AiSession, steps: TestStep[]) {
  for (const { test, ...props } of steps) {
    yield* session.createRequest({
      ...props,
      observer: GenerationObserver.fromPrinter(new ConsolePrinter({ mode: 'json' })),
    });
    const messages = yield* Effect.promise(() => session.getHistory());
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
export const addBlueprints = Effect.fnUntraced(function* (blueprints: Definition[]) {
  yield* AiContextService.bindContext({
    blueprints: yield* pipe(
      blueprints,
      Arr.map((blueprint) => blueprint.make()),
      Effect.forEach(Database.add),
      Effect.map(Arr.map(Ref.make)),
    ),
  });
});
