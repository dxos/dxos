//
// Copyright 2026 DXOS.org
//

import * as Chunk from 'effect/Chunk';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';
import { describe, test } from 'vitest';

import { EffectEx } from '@dxos/effect';

import * as Stage from './Stage';

describe('Stage.map', () => {
  test('applies the function to each item in order (concurrency 1)', async ({ expect }) => {
    // Standalone stage: annotate the callback parameter to pin `In` (nothing upstream to infer from).
    const stage = Stage.map('double', (n: number) => Effect.succeed(n * 2));
    const out = await collect(stage(Stream.fromIterable([1, 2, 3])));
    expect(out).toEqual([2, 4, 6]);
  });

  test('injects the shared context via the Requirements channel', async ({ expect }) => {
    class Factor extends Context.Tag('Factor')<Factor, { readonly factor: number }>() {}
    // `R` (the Factor requirement) infers from the callback; only `In` needs the annotation.
    const stage = Stage.map('scale', (n: number) => Factor.pipe(Effect.map(({ factor }) => n * factor)));
    const out = await collect(
      stage(Stream.fromIterable([1, 2, 3])).pipe(Stream.provideService(Factor, { factor: 10 })),
    );
    expect(out).toEqual([10, 20, 30]);
  });
});

describe('Stage.filter', () => {
  test('drops items that do not match the predicate', async ({ expect }) => {
    const stage = Stage.filter('evens', (n: number) => n % 2 === 0);
    const out = await collect(stage(Stream.fromIterable([1, 2, 3, 4])));
    expect(out).toEqual([2, 4]);
  });
});

describe('Stage.window', () => {
  test('invokes with a growing then sliding window of the last `size` items', async ({ expect }) => {
    const stage = Stage.window('win', 2, (window: readonly number[]) => Effect.succeed([...window]));
    const out = await collect(stage(Stream.fromIterable([1, 2, 3, 4])));
    expect(out).toEqual([[1], [1, 2], [2, 3], [3, 4]]);
  });

  test('injects the shared context via the Requirements channel', async ({ expect }) => {
    class Base extends Context.Tag('Base')<Base, { readonly base: number }>() {}
    const stage = Stage.window('sum', 2, (window: readonly number[]) =>
      Base.pipe(Effect.map(({ base }) => window.reduce((total, item) => total + item, base))),
    );
    const out = await collect(stage(Stream.fromIterable([1, 2, 3])).pipe(Stream.provideService(Base, { base: 100 })));
    expect(out).toEqual([101, 103, 105]);
  });

  test('rejects a non-positive window size', ({ expect }) => {
    expect(() => Stage.window('bad', 0, (window: readonly number[]) => Effect.succeed(window.length))).toThrow(
      RangeError,
    );
  });
});

const collect = <Out, E>(stream: Stream.Stream<Out, E>): Promise<readonly Out[]> =>
  EffectEx.runPromise(stream.pipe(Stream.runCollect, Effect.map(Chunk.toReadonlyArray)));
