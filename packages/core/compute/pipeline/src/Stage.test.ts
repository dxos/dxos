//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';
import { describe, test } from 'vitest';

import * as EffectEx from '@dxos/effect/EffectEx';

import * as Stage from './Stage.ts';

describe('Stage.map', () => {
  test('applies the function to each item in order (concurrency 1)', async ({ expect }) => {
    // Standalone stage: annotate the callback parameter to pin `In` (nothing upstream to infer from).
    const stage = Stage.map('double', (n: number) => Effect.succeed(n * 2));
    const out = await collect(stage(Stream.fromIterable([1, 2, 3])));
    expect(out).toEqual([2, 4, 6]);
  });

  test('injects the shared context via the Requirements channel', async ({ expect }) => {
    class Factor extends Context.Service<Factor, { readonly factor: number }>()('Factor') {}
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
    class Base extends Context.Service<Base, { readonly base: number }>()('Base') {}
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

describe('Stage.batch', () => {
  test('groups consecutive items up to `size`, flushing the partial tail at stream end', async ({ expect }) => {
    const batches: number[][] = [];
    const stage = Stage.batch('batch', { size: 3 }, (items: readonly number[]) =>
      Effect.sync(() => {
        batches.push([...items]);
        return items.map((item) => item * 10);
      }),
    );
    const out = await collect(stage(Stream.fromIterable([1, 2, 3, 4, 5, 6, 7])));
    expect(batches).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
    expect(out).toEqual([10, 20, 30, 40, 50, 60, 70]);
  });

  test('zero-weight items ride along with the next weighted batch, in order', async ({ expect }) => {
    const batches: string[][] = [];
    const stage = Stage.batch(
      'weighted',
      { size: 2, weight: (item: string) => (item.startsWith('m') ? 1 : 0) },
      (items: readonly string[]) =>
        Effect.sync(() => {
          batches.push([...items]);
          return items;
        }),
    );
    const out = await collect(stage(Stream.fromIterable(['start', 'm1', 'm2', 'm3', 'end'])));
    expect(batches).toEqual([
      ['start', 'm1', 'm2'],
      ['m3', 'end'],
    ]);
    expect(out).toEqual(['start', 'm1', 'm2', 'm3', 'end']);
  });

  test('closes a batch without pulling past the item that fills it', async ({ expect }) => {
    const pulled: number[] = [];
    const seen: number[][] = [];
    const source = Stream.fromIterable([1, 2, 3, 4]).pipe(
      Stream.rechunk(1),
      Stream.tap((item) => Effect.sync(() => pulled.push(item))),
    );
    const stage = Stage.batch('lazy', { size: 2 }, (items: readonly number[]) =>
      Effect.sync(() => {
        seen.push([...pulled]);
        return items;
      }),
    );
    await collect(stage(source));
    // When the first batch runs, only the two items that filled it have been pulled.
    expect(seen[0]).toEqual([1, 2]);
  });

  test('an fn may emit fewer or more outputs than its batch', async ({ expect }) => {
    const stage = Stage.batch('sum', { size: 2 }, (items: readonly number[]) =>
      Effect.succeed([items.reduce((total, item) => total + item, 0)]),
    );
    const out = await collect(stage(Stream.fromIterable([1, 2, 3, 4, 5])));
    expect(out).toEqual([3, 7, 5]);
  });

  test('rejects a non-positive batch size', ({ expect }) => {
    expect(() => Stage.batch('bad', { size: 0 }, (items: readonly number[]) => Effect.succeed(items))).toThrow(
      RangeError,
    );
  });
});

const collect = <Out, E>(stream: Stream.Stream<Out, E>): Promise<readonly Out[]> =>
  EffectEx.runPromise(stream.pipe(Stream.runCollect));
