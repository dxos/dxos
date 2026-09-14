//
// Copyright 2025 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Tracer from 'effect/Tracer';
import * as FetchHttpClient from 'effect/unstable/http/FetchHttpClient';
import type { TestContext } from 'vitest';

/** Forwards to `globalThis.fetch` per call, so a stub installed mid-effect is still picked up. */
const currentFetch: typeof globalThis.fetch = (...args) => globalThis.fetch(...args);

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
   *   TestHelpers.runIf(process.env.DX_ANTHROPIC_API_KEY),
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
   *   TestHelpers.skipIf(!process.env.DX_ANTHROPIC_API_KEY),
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

  /**
   * Bind the HTTP client to whatever `globalThis.fetch` is when the effect runs.
   *
   * `FetchHttpClient.Fetch` is a `Context.Reference` whose default is cached on first read for the
   * life of the process, so a test that stubs the global afterwards is ignored — every request after
   * the first keeps using the first test's stub (and, for a `Response` instance, its consumed body).
   *
   * Example:
   * ```ts
   * const result = await EffectEx.runPromise(TestHelpers.withStubbedFetch(fetchRss(url)));
   * ```
   */
  export const withStubbedFetch = <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
    Effect.provideService(effect, FetchHttpClient.Fetch, currentFetch);

  /** Layer form of {@link withStubbedFetch}, for harnesses that compose their services as a layer. */
  export const StubbedFetch: Layer.Layer<never> = Layer.succeed(FetchHttpClient.Fetch, currentFetch);
}

/**
 * Exposes vitest test context as an effect service.
 */
export class TestContextService extends Context.Service<TestContextService, TestContext>()(
  '@dxos/effect/TestContextService',
) {}

/**
 * A tracer that records every span it opens into `spans`, delegating the span itself to the default
 * tracer, so a test can assert on names, attributes, and parents without an exporter.
 */
export const makeRecordingTracer = (spans: Tracer.Span[]): Tracer.Tracer => {
  const base = Effect.runSync(Effect.tracer);
  return Tracer.make({
    span: (options) => {
      const span = base.span(options);
      spans.push(span);
      return span;
    },
  });
};
