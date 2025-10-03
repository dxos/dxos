//
// Copyright 2025 DXOS.org
//

import { Context, Effect } from 'effect';
import type { TestContext } from 'vitest';

// TODO(dmaretskyi): Add all different test tags here.
export type TestTag =
  | 'flaky' // Flaky tests.
  | 'llm' // Tests with AI.
  | 'sync'; // Sync with external services.

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

  /**
   * Skips this test if the tag is not in the list of tags to run.
   * Tags are specified in the `DX_TEST_TAGS` environment variable.
   *
   * @param tag
   * @returns
   */
  export const taggedTest =
    (tag: TestTag) =>
    <A, E, R>(effect: Effect.Effect<A, E, R>, ctx: TestContext): Effect.Effect<A, E, R> =>
      Effect.gen(function* () {
        if (!process.env.DX_TEST_TAGS?.includes(tag)) {
          ctx.skip();
        } else {
          return yield* effect;
        }
      });

  /**
   * Provide TestContext from test parameters.
   *
   * Exmaple:
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
