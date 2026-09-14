//
// Copyright 2025 DXOS.org
//

import { it } from '@effect/vitest';
import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';

import { runAndForwardErrors } from './internal/errors.ts';

const doWork = Effect.fn('doWork')(function* () {
  yield* Effect.sleep('1 minute');
  return 'work done';
});

it.effect.skip(
  'call a function to generate a research report',
  Effect.fnUntraced(
    function* (_) {
      const resultFiber = yield* doWork().pipe(Effect.forkChild);
      setTimeout(() => {
        void runAndForwardErrors(Fiber.interrupt(resultFiber));
      }, 2_000);

      const result = yield* Fiber.join(resultFiber);
      console.log({ result });
    },
    Effect.catchCause((cause) => {
      // console.log(inspect(cause, { depth: null, colors: true }));
      console.log(Cause.pretty(cause));
      return Effect.failCause(cause);
    }),
  ),
);
