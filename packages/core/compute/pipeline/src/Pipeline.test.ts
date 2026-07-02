//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import { EffectEx } from '@dxos/effect';

import * as Pipeline from './Pipeline';
import * as Stage from './Stage';
import { captureSink, scriptedSource } from './testing';

describe('Pipeline.run', () => {
  test('chains stages left-to-right and drains to the sink', async ({ expect }) => {
    const { sink, items } = captureSink<number>();
    await EffectEx.runPromise(
      Pipeline.run({
        source: scriptedSource([1, 2, 3]),
        stages: [
          Stage.map<number, number, {}>('double', (n) => Effect.succeed(n * 2)),
          Stage.map<number, number, {}>('inc', (n) => Effect.succeed(n + 1)),
        ],
        sink,
        context: {},
      }),
    );
    expect(items).toEqual([3, 5, 7]);
  });

  test('propagates the shared context to every stage', async ({ expect }) => {
    const { sink, items } = captureSink<number>();
    await EffectEx.runPromise(
      Pipeline.run({
        source: scriptedSource([1, 2]),
        stages: [Stage.map<number, number, { factor: number }>('scale', (n, ctx) => Effect.succeed(n * ctx.factor))],
        sink,
        context: { factor: 5 },
      }),
    );
    expect(items).toEqual([5, 10]);
  });

  test('skips undefined stage outputs before the sink', async ({ expect }) => {
    const { sink, items } = captureSink<number>();
    await EffectEx.runPromise(
      Pipeline.run({
        source: scriptedSource([1, 2, 3, 4]),
        stages: [
          Stage.map<number, number | undefined, {}>('evens', (n) => Effect.succeed(n % 2 === 0 ? n : undefined)),
        ],
        sink,
        context: {},
      }),
    );
    expect(items).toEqual([2, 4]);
  });
});

describe('Pipeline.run overflow', () => {
  test('suspend (default) delivers every item to a slow sink — no loss', async ({ expect }) => {
    const items: number[] = [];
    // A sink that yields between commits; back pressure must still deliver all items.
    const sink = (out: number) => Effect.sync(() => items.push(out)).pipe(Effect.zipLeft(Effect.yieldNow()));
    await EffectEx.runPromise(
      Pipeline.run({
        source: scriptedSource(Array.from({ length: 50 }, (_unused, index) => index)),
        stages: [Stage.map<number, number, {}>('id', (n) => Effect.succeed(n))],
        sink,
        context: {},
        overflow: 'suspend',
        bufferSize: 4,
      }),
    );
    expect(items).toEqual(Array.from({ length: 50 }, (_unused, index) => index));
  });

  test('sliding pipeline runs to completion and delivers the final item', async ({ expect }) => {
    const { sink, items } = captureSink<number>();
    await EffectEx.runPromise(
      Pipeline.run({
        source: scriptedSource([1, 2, 3, 4, 5]),
        stages: [Stage.map<number, number, {}>('id', (n) => Effect.succeed(n))],
        sink,
        context: {},
        overflow: 'sliding',
        bufferSize: 2,
      }),
    );
    expect(items.length).toBeGreaterThan(0);
    expect(items[items.length - 1]).toBe(5);
  });

  test('per-stage overflow override runs to completion', async ({ expect }) => {
    const { sink, items } = captureSink<number>();
    await EffectEx.runPromise(
      Pipeline.run({
        source: scriptedSource([1, 2, 3]),
        stages: [Stage.map<number, number, {}>('id', (n) => Effect.succeed(n), { overflow: 'sliding', bufferSize: 1 })],
        sink,
        context: {},
      }),
    );
    expect(items[items.length - 1]).toBe(3);
  });
});
