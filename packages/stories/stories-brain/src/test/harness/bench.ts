//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';

import { type AiService } from '@dxos/ai';
import { AiServiceTestingPreset } from '@dxos/ai/testing';
import { EffectEx } from '@dxos/effect';
import { log } from '@dxos/log';
import { Pipeline, Stage } from '@dxos/pipeline';
import {
  type BenchmarkResult,
  type MetricsSnapshot,
  captureSink,
  instrument,
  renderBenchmark,
  runBenchmark,
} from '@dxos/pipeline/testing';

import { type ModelVariant } from './models';
import { writeResults } from './results';

/** Logs the comparison table and writes the results JSON; returns the result. */
export const reportBenchmark = (
  name: string,
  result: BenchmarkResult,
  meta: Record<string, unknown> = {},
): BenchmarkResult => {
  log.info(`${name}\n${renderBenchmark(result)}`);
  writeResults(name, { name, ...meta, variants: result.variants });
  return result;
};

/**
 * The core reusable harness for the per-item Phase 1 tests: pipes every item (message, thread, …)
 * through a stage that runs `perItem` under each model variant's AI backend, captures the per-item
 * results, and derives comparable metrics via `evaluate`. A variant that errors is recorded as an
 * `error` row rather than aborting the comparison (see `runBenchmark`). Results are written to JSON.
 */
export const runItemsBench = <Item, Result>(options: {
  readonly name: string;
  readonly items: readonly Item[];
  readonly variants: readonly ModelVariant[];
  readonly perItem: (item: Item, variant: ModelVariant) => Effect.Effect<Result, never, AiService.AiService>;
  readonly evaluate: (variant: ModelVariant, results: readonly Result[]) => MetricsSnapshot;
  readonly meta?: Record<string, unknown>;
}): Promise<BenchmarkResult> =>
  EffectEx.runPromise(
    runBenchmark({
      variants: options.variants.map((variant) => ({ name: variant.name, config: variant })),
      program: (variant) => {
        const { sink, items } = captureSink<Result>();
        return Stream.fromIterable(options.items)
          .pipe(
            instrument(
              options.name,
              Stage.map(options.name, (item: Item) => options.perItem(item, variant)),
            ),
            Pipeline.run({ sink }),
          )
          .pipe(Effect.provide(AiServiceTestingPreset(variant.preset)), Effect.as(items));
      },
      evaluate: (variant, results) => Effect.succeed(options.evaluate(variant, results)),
    }),
  ).then((result) =>
    reportBenchmark(options.name, result, { corpusSize: options.items.length, ...(options.meta ?? {}) }),
  );
