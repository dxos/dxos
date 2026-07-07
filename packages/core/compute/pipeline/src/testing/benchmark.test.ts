//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';
import { describe, test } from 'vitest';

import { EffectEx } from '@dxos/effect';

import * as Pipeline from '../Pipeline';
import * as Stage from '../Stage';
import { renderBenchmark, runBenchmark } from './benchmark';
import { captureSink } from './capture';
import { instrument } from './instrument';
import { useMetrics } from './metrics';

describe('benchmark framework', () => {
  test('instrument records per-stage in/out/error counters', async ({ expect }) => {
    // A stage that drops odds (out < in) so in/out differ observably.
    const evens = Stage.map('evens', (n: number) => Effect.succeed(n % 2 === 0 ? n : undefined));

    const result = await EffectEx.runPromise(
      runBenchmark({
        variants: [{ name: 'default', config: {} }],
        program: () => {
          const { sink, items } = captureSink<number>();
          return Stream.fromIterable([1, 2, 3, 4])
            .pipe(instrument('evens', evens), Pipeline.run({ sink }))
            .pipe(Effect.as(items));
        },
      }),
    );

    const { metrics } = result.variants[0];
    expect(metrics['evens.in']).toBe(4);
    expect(metrics['evens.out']).toBe(2);
    expect(metrics['evens.errors'] ?? 0).toBe(0);
    expect(typeof metrics['total.ms']).toBe('number');
  });

  test('stages emit custom metrics; evaluator adds effectful domain metrics', async ({ expect }) => {
    // Stage opts into Metrics to count a domain event.
    const flagLarge = Stage.map('flag', (n: number) =>
      (n >= 3 ? useMetrics((metrics) => metrics.inc('large')) : Effect.void).pipe(Effect.as(n)),
    );

    const result = await EffectEx.runPromise(
      runBenchmark({
        variants: [{ name: 'v1', config: { threshold: 3 } }],
        program: () => {
          const { sink, items } = captureSink<number>();
          return Stream.fromIterable([1, 2, 3, 4, 5]).pipe(flagLarge, Pipeline.run({ sink })).pipe(Effect.as(items));
        },
        evaluate: (_config, items) => Effect.succeed({ count: items.length, sum: items.reduce((a, b) => a + b, 0) }),
      }),
    );

    const { metrics } = result.variants[0];
    expect(metrics.large).toBe(3); // 3, 4, 5
    expect(metrics.count).toBe(5);
    expect(metrics.sum).toBe(15);
  });

  test('runs multiple variants and a failing variant is isolated', async ({ expect }) => {
    const result = await EffectEx.runPromise(
      runBenchmark<{ fail: boolean }, number, Error, never>({
        variants: [
          { name: 'ok', config: { fail: false } },
          { name: 'bad', config: { fail: true } },
        ],
        program: (config) => (config.fail ? Effect.fail(new Error('boom')) : Effect.succeed(42)),
        evaluate: (_config, output) => Effect.succeed({ answer: output }),
      }),
    );

    expect(result.variants.map((variant) => variant.variant)).toEqual(['ok', 'bad']);
    expect(result.variants[0].metrics.answer).toBe(42);
    expect(String(result.variants[1].metrics.error)).toContain('boom');
    // The failing variant does not abort the comparison.
    expect(result.variants).toHaveLength(2);
  });

  test('renderBenchmark tabulates metrics as rows and variants as columns', async ({ expect }) => {
    const table = renderBenchmark({
      variants: [
        { variant: 'gpt-oss', metrics: { 'total.ms': 1200, 'facts': 8 } },
        { variant: 'llama', metrics: { 'total.ms': 400, 'facts': 3 } },
      ],
    });
    expect(table).toContain('metric');
    expect(table).toContain('gpt-oss');
    expect(table).toContain('llama');
    expect(table).toMatch(/facts\s+8\s+3/);
  });
});
