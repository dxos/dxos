//
// Copyright 2025 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import type { TestContext } from 'vitest';

export namespace TestHelpers {
  /**
   * Skip the test if the condition is false.
   *
   * Example:
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
   * Example:
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

  /**
   * Provide TestContext from test parameters.
   *
   * Example:
   * ```ts
   * it.effect(
   *   'with context',
   *   Effect.fn(function* ({ expect }) {
   *     const ctx = yield* TestContextService;
   *   }),
   *   TestHelpers.provideTestContext,
   * );
   * ```
   */
  export const provideTestContext = <A, E, R>(
    effect: Effect.Effect<A, E, R>,
    ctx: TestContext,
  ): Effect.Effect<A, E, Exclude<R, TestContextService>> => Effect.provideService(effect, TestContextService, ctx);
}

/**
 * Exposes vitest test context as an effect service.
 */
export class TestContextService extends Context.Tag('@dxos/effect/TestContextService')<
  TestContextService,
  TestContext
>() {}
