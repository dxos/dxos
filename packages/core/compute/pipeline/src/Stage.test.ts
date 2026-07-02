//
// Copyright 2026 DXOS.org
//

import * as Chunk from 'effect/Chunk';
import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';
import { describe, test } from 'vitest';

import { EffectEx } from '@dxos/effect';

import * as Stage from './Stage';

const collect = <Out, E>(stream: Stream.Stream<Out, E>): Promise<readonly Out[]> =>
  EffectEx.runPromise(stream.pipe(Stream.runCollect, Effect.map(Chunk.toReadonlyArray)));

describe('Stage.map', () => {
  test('applies the function to each item in order (concurrency 1)', async ({ expect }) => {
    const stage = Stage.map<number, number, {}>('double', (n) => Effect.succeed(n * 2));
    const out = await collect(stage.transform(Stream.fromIterable([1, 2, 3]), {}));
    expect(out).toEqual([2, 4, 6]);
  });

  test('injects the shared context', async ({ expect }) => {
    const stage = Stage.map<number, number, { factor: number }>('scale', (n, ctx) => Effect.succeed(n * ctx.factor));
    const out = await collect(stage.transform(Stream.fromIterable([1, 2, 3]), { factor: 10 }));
    expect(out).toEqual([10, 20, 30]);
  });
});

describe('Stage.filter', () => {
  test('drops items that do not match the predicate', async ({ expect }) => {
    const stage = Stage.filter<number, {}>('evens', (n) => n % 2 === 0);
    const out = await collect(stage.transform(Stream.fromIterable([1, 2, 3, 4]), {}));
    expect(out).toEqual([2, 4]);
  });
});
