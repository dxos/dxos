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

import { SAMPLES } from './config';
import { type ModelVariant } from './models';
import { progressReportingLayer } from './progress';
import { startResponseLog, writeResults } from './results';

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
  /**
   * Max per-variant result rows to retain. Defaults to ALL (the `SAMPLES` env caps it) so the actual
   * outputs are visible, not just stats.
   */
  readonly sampleSize?: number;
  /**
   * Renders a result as free text. When provided, the per-variant outputs are written to a sister
   * markdown file (`<name>.md`) and the (cumbersome) prose is kept OUT of the JSON; the JSON keeps
   * only stats. When omitted, the compact structured results are embedded in the JSON.
   */
  readonly renderResponse?: (result: Result) => string;
  readonly meta?: Record<string, unknown>;
}): Promise<BenchmarkResult> => {
  const cap = options.sampleSize ?? SAMPLES ?? Number.POSITIVE_INFINITY;
  const outputs = new Map<string, readonly Result[]>();
  const render = options.renderResponse;
  // Prose responses stream to the sister markdown incrementally as each item completes.
  const responseLog = render ? startResponseLog(options.name) : undefined;
  const counters = new Map<string, number>();
  return EffectEx.runPromise(
    runBenchmark({
      variants: options.variants.map((variant) => ({ name: variant.name, config: variant })),
      program: (variant) => {
        const { sink, items } = captureSink<Result>();
        return Stream.fromIterable(options.items)
          .pipe(
            instrument(
              options.name,
              Stage.map(options.name, (item: Item) =>
                options.perItem(item, variant).pipe(
                  Effect.tap((result) =>
                    Effect.sync(() => {
                      if (responseLog && render) {
                        const index = (counters.get(variant.name) ?? 0) + 1;
                        counters.set(variant.name, index);
                        responseLog.append({ title: `${variant.name} — ${index}`, body: render(result) });
                      }
                    }),
                  ),
                ),
              ),
            ),
            // Live progress (current/total message index) → shared progress.json.
            Stage.track(options.name, { total: options.items.length, label: options.name }),
            Pipeline.run({ sink }),
          )
          .pipe(Effect.provide(AiServiceTestingPreset(variant.preset)), Effect.as(items));
      },
      evaluate: (variant, results) => {
        outputs.set(variant.name, Number.isFinite(cap) ? results.slice(0, cap) : results);
        return Effect.succeed(options.evaluate(variant, results));
      },
    }).pipe(Effect.provide(progressReportingLayer())),
  ).then((result) =>
    // Prose already streamed to `<name>.md`; JSON stays stats-only. Without a renderer, embed the
    // compact structured per-model results (e.g. tags) in the JSON instead.
    reportBenchmark(options.name, result, {
      corpusSize: options.items.length,
      ...(options.meta ?? {}),
      ...(render ? {} : { results: Object.fromEntries([...outputs.entries()]) }),
    }),
  );
};
