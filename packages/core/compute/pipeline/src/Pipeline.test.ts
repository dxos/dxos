//
// Copyright 2026 DXOS.org
//

import { describe, it, test } from '@effect/vitest';
import * as Cause from 'effect/Cause';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Fiber from 'effect/Fiber';
import * as Layer from 'effect/Layer';
import * as Stream from 'effect/Stream';

import { EffectEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';

import * as Pipeline from './Pipeline';
import * as Stage from './Stage';
import { captureSink } from './testing';

describe('Pipeline.run', () => {
  test('chains stages left-to-right and drains to the sink', async ({ expect }) => {
    const { sink, items } = captureSink<number>();
    await EffectEx.runPromise(
      Stream.fromIterable([1, 2, 3]).pipe(
        Stage.map('double', (n) => Effect.succeed(n * 2)),
        Stage.map('inc', (n) => Effect.succeed(n + 1)),
        Pipeline.run({ sink }),
      ),
    );
    expect(items).toEqual([3, 5, 7]);
  });

  test('propagates the shared context via the Requirements channel', async ({ expect }) => {
    class Factor extends Context.Tag('Factor')<Factor, { readonly factor: number }>() {}
    const { sink, items } = captureSink<number>();
    const program = Stream.fromIterable([1, 2]).pipe(
      Stage.map('scale', (n) => Factor.pipe(Effect.map(({ factor }) => n * factor))),
      Pipeline.run({ sink }),
    );
    await EffectEx.runPromise(Effect.provide(program, Layer.succeed(Factor, { factor: 5 })));
    expect(items).toEqual([5, 10]);
  });

  test('skips undefined stage outputs before the sink', async ({ expect }) => {
    const { sink, items } = captureSink<number>();
    await EffectEx.runPromise(
      Stream.fromIterable([1, 2, 3, 4]).pipe(
        Stage.map('evens', (n) => Effect.succeed(n % 2 === 0 ? n : undefined)),
        Pipeline.run({ sink }),
      ),
    );
    expect(items).toEqual([2, 4]);
  });

  test('drops undefined between stages so a mid-chain stage can no-op', async ({ expect }) => {
    const { sink, items } = captureSink<number>();
    await EffectEx.runPromise(
      Stream.fromIterable([1, 2, 3, 4]).pipe(
        // First stage no-ops on odds; the undefined must NOT reach the second stage.
        Stage.map('evens', (n) => Effect.succeed(n % 2 === 0 ? n : undefined)),
        // Second stage would produce NaN if it ever received `undefined`.
        Stage.map('inc', (n) => Effect.succeed(n + 1)),
        Pipeline.run({ sink }),
      ),
    );
    expect(items).toEqual([3, 5]);
  });
});

describe('Pipeline.run overflow', () => {
  test('suspend (default) delivers every item to a slow sink — no loss', async ({ expect }) => {
    const items: number[] = [];
    // A sink that yields between commits; back pressure must still deliver all items.
    const sink = (out: number) => Effect.sync(() => items.push(out)).pipe(Effect.zipLeft(Effect.yieldNow()));
    await EffectEx.runPromise(
      Stream.fromIterable(Array.from({ length: 50 }, (_unused, index) => index)).pipe(
        Stage.map('id', (n) => Effect.succeed(n)),
        Pipeline.run({ sink, overflow: 'suspend', bufferSize: 4 }),
      ),
    );
    expect(items).toEqual(Array.from({ length: 50 }, (_unused, index) => index));
  });

  test('sliding pipeline runs to completion and delivers the final item', async ({ expect }) => {
    const { sink, items } = captureSink<number>();
    await EffectEx.runPromise(
      Stream.fromIterable([1, 2, 3, 4, 5]).pipe(
        Stage.map('id', (n) => Effect.succeed(n)),
        Pipeline.run({ sink, overflow: 'sliding', bufferSize: 2 }),
      ),
    );
    expect(items.length).toBeGreaterThan(0);
    expect(items[items.length - 1]).toBe(5);
  });

  test('per-stage overflow override runs to completion', async ({ expect }) => {
    const { sink, items } = captureSink<number>();
    await EffectEx.runPromise(
      Stream.fromIterable([1, 2, 3]).pipe(
        Stage.map('id', (n) => Effect.succeed(n), { overflow: 'sliding', bufferSize: 1 }),
        Pipeline.run({ sink }),
      ),
    );
    expect(items[items.length - 1]).toBe(3);
  });

  test('per-stage sliding overflow coalesces stale input while a slow run is in flight', async ({ expect }) => {
    const runs: number[] = [];
    // A slow map over a synchronous 4-item source: while the first run sleeps, items 2/3/4 arrive and
    // the input-side sliding buffer (capacity 1) keeps only the latest, so intermediate items drop.
    const slow = Stage.map(
      'slow',
      (n: number) => Effect.sync(() => runs.push(n)).pipe(Effect.zipRight(Effect.sleep('40 millis')), Effect.as(n)),
      { overflow: 'sliding', bufferSize: 1 },
    );
    const { sink } = captureSink<number>();
    await EffectEx.runPromise(Stream.fromIterable([1, 2, 3, 4]).pipe(slow, Pipeline.run({ sink })));
    expect(runs.length).toBeLessThan(4);
    expect(runs.at(-1)).toBe(4);
  });

  it.live(
    'abort',
    Effect.fnUntraced(function* ({ expect }) {
      const controller = new AbortController();
      const { sink } = captureSink<number>();
      const pipeline = yield* Effect.fork(
        Stream.fromIterable(Array.from({ length: 100 }, (_, index) => index)).pipe(
          Stage.map('id', (n) => Effect.succeed(n)),
          Stage.map('sleep', (n) => Effect.sleep('10 millis').pipe(Effect.as(n)), {
            overflow: 'suspend',
            bufferSize: 4,
          }),
          // Stage.map('log', (n) =>
          //   Effect.sync(() => {
          //     console.log('item', n);
          //     return n;
          //   }),
          // ),
          Pipeline.run({ sink, overflow: 'suspend', bufferSize: 4 }),
          Pipeline.abortWith(controller.signal),
          Effect.withSpan('pipeline'),
          Effect.exit,
        ),
      );

      const aborter = yield* Effect.fork(
        Effect.gen(function* () {
          yield* Effect.sleep('500 millis');
          console.log('aborting');
          controller.abort();
        }),
      );

      yield* Fiber.join(aborter);
      const result = yield* Fiber.join(pipeline);
      invariant(Exit.isFailure(result), 'pipeline should fail');
      invariant(Cause.isInterrupted(result.cause), 'pipeline should be interrupted');
    }),
  );

  it.live(
    'abortWith runs onCancel on abort',
    Effect.fnUntraced(function* ({ expect }) {
      const controller = new AbortController();
      let cancelled = false;
      const { sink } = captureSink<number>();
      const pipeline = yield* Effect.fork(
        Stream.fromIterable(Array.from({ length: 100 }, (_, index) => index)).pipe(
          Stage.map('sleep', (n) => Effect.sleep('10 millis').pipe(Effect.as(n)), {
            overflow: 'suspend',
            bufferSize: 4,
          }),
          Pipeline.run({ sink, overflow: 'suspend', bufferSize: 4 }),
          Pipeline.abortWith(
            controller.signal,
            Effect.sync(() => {
              cancelled = true;
            }),
          ),
          Effect.exit,
        ),
      );

      controller.abort();
      yield* Fiber.join(pipeline);
      expect(cancelled).toBe(true);
    }),
  );
});
