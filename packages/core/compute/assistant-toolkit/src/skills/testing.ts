//
// Copyright 2025 DXOS.org
//

import * as Arr from 'effect/Array';
import * as Effect from 'effect/Effect';
import { pipe } from 'effect/Function';

import { ConsolePrinter } from '@dxos/ai';
import { AiRequest, AiSession, GenerationObserver, Harness } from '@dxos/assistant';
import type { Skill } from '@dxos/compute';
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
 * Binds skills from the skill definitions.
 */
// TODO(dmaretskyi): Potentially the agent will auto-bind the skills.
export const addSkills = Effect.fnUntraced(function* (skills: Skill.Definition[]) {
  const skillRefs = yield* pipe(
    skills,
    Arr.map((skill) => skill.make()),
    Effect.forEach(Database.add),
    Effect.map(Arr.map(Ref.make)),
  );
  yield* Harness.bindContext({ skills: skillRefs });
});
