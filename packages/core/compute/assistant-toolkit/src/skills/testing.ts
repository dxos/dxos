//
// Copyright 2025 DXOS.org
//

import * as Arr from 'effect/Array';
import * as Effect from 'effect/Effect';
import { pipe } from 'effect/Function';

import { ConsolePrinter } from '@dxos/ai';
import { AiRequest, AiSession, GenerationObserver, Harness } from '@dxos/assistant';
import type { Blueprint } from '@dxos/compute';
import { Database, Ref } from '@dxos/echo';
import { log } from '@dxos/log';

export type TestStep = Pick<AiSession.RunProps, 'prompt' | 'system'> & {
  test?: () => Promise<void>;
};

/**
 * Runs the prompt steps, calling the test function after each step.
 */
export const runSteps: (
  session: AiSession.Session,
  steps: TestStep[],
) => Effect.Effect<void, AiRequest.RunError, AiRequest.RunRequirements> = Effect.fn(function* (
  session: AiSession.Session,
  steps: TestStep[],
) {
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
export const addBlueprints = Effect.fnUntraced(function* (blueprints: Blueprint.Definition[]) {
  const refs = yield* pipe(
    blueprints,
    Arr.map((blueprint) => blueprint.make()),
    Effect.forEach(Database.add),
    Effect.map(Arr.map(Ref.make)),
  );
  const binder = yield* Harness.binder;
  yield* Effect.promise(() => binder.bind({ blueprints: refs }));
});
