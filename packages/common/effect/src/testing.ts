//
// Copyright 2025 DXOS.org
//

import { Effect } from 'effect';
import type { TestContext } from 'vitest';

export namespace TestHelpers {
  /**
   * Skip the test if the condition is false.
   *
   * Exmaple:
   * ```ts
   * it.effect(
   *   'should process an agentic loop using Claude',
   *   Effect.fn(function* ({ expect }) {
   *     // ...
   *   }),
   *   TestHelpers.runIf(process.env.ANTHROPIC_API_KEY),
   * );
   * ```
   */
  export const runIf =
    (condition: unknown) =>
    <A, E, R>(effect: Effect.Effect<A, E, R>, ctx: TestContext): Effect.Effect<A, E, R> =>
      Effect.gen(function* () {
        if (!condition) {
          ctx.skip();
        } else {
          return yield* effect;
        }
      });

  /**
   * Skip the test if the condition is true.
   *
   * Exmaple:
   * ```ts
   * it.effect(
   *   'should process an agentic loop using Claude',
   *   Effect.fn(function* ({ expect }) {
   *     // ...
   *   }),
   *   TestHelpers.skipIf(!process.env.ANTHROPIC_API_KEY),
   * );
   * ```
   */
  export const skipIf =
    (condition: unknown) =>
    <A, E, R>(effect: Effect.Effect<A, E, R>, ctx: TestContext): Effect.Effect<A, E, R> =>
      Effect.gen(function* () {
        if (condition) {
          ctx.skip();
        } else {
          return yield* effect;
        }
      });
}
