//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type AiService } from '@dxos/ai';
import { AiServiceTestingPreset } from '@dxos/ai/testing';
import { EffectEx } from '@dxos/effect';

import { type ModelVariant } from '../models';

// Runs a task across the model ladder with fair timing. For each variant it WARMS the model once
// (a cold Ollama load is a 10–30s VRAM spike that would poison the average), then runs every item
// serially — no concurrency — so per-item latency is a clean steady-state measurement. Returns the
// per-item outputs plus p50/p95/mean latency and throughput, so accuracy graders and the report can
// line up quality against cost per model.

export type ItemRun<Item, Result> = {
  readonly item: Item;
  readonly output: Result;
  readonly latencyMs: number;
};

export type LatencyStats = {
  readonly p50: number;
  readonly p95: number;
  readonly mean: number;
  /** Items per second (steady-state, serial). */
  readonly throughput: number;
};

export type LadderResult<Item, Result> = {
  readonly model: string;
  readonly reasoning: boolean;
  readonly runs: readonly ItemRun<Item, Result>[];
  readonly latency: LatencyStats;
};

const percentile = (values: readonly number[], percent: number): number => {
  if (values.length === 0) {
    return NaN;
  }
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.floor((percent / 100) * sorted.length));
  return sorted[index];
};

const latencyStats = (latencies: readonly number[]): LatencyStats => {
  const total = latencies.reduce((sum, value) => sum + value, 0);
  return {
    p50: percentile(latencies, 50),
    p95: percentile(latencies, 95),
    mean: latencies.length ? Math.round(total / latencies.length) : NaN,
    throughput: total > 0 ? Math.round((latencies.length / total) * 1000 * 100) / 100 : 0,
  };
};

/**
 * Runs `task` over every item under each variant, timing each call. The variant's AI backend is
 * provided per call; a per-item failure degrades to the task's own fallback (the task fns never
 * reject), so one bad response never aborts the sweep.
 */
export const runLadder = async <Item, Result>(options: {
  readonly variants: readonly ModelVariant[];
  readonly items: readonly Item[];
  readonly task: (item: Item, variant: ModelVariant) => Effect.Effect<Result, never, AiService.AiService>;
  /** Called once per completed item (progress hook). */
  readonly onItem?: (variant: ModelVariant, index: number) => void;
}): Promise<LadderResult<Item, Result>[]> => {
  const { variants, items, task, onItem } = options;
  const results: LadderResult<Item, Result>[] = [];

  for (const variant of variants) {
    const provide = <Value>(effect: Effect.Effect<Value, never, AiService.AiService>): Promise<Value> =>
      EffectEx.runPromise(effect.pipe(Effect.provide(AiServiceTestingPreset(variant.preset))));

    // Warm the model with the first item (excluded from timing) so the cold VRAM load doesn't skew p50.
    if (items.length > 0) {
      await provide(task(items[0], variant));
    }

    const runs: ItemRun<Item, Result>[] = [];
    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      const start = performance.now();
      const output = await provide(task(item, variant));
      const latencyMs = Math.round(performance.now() - start);
      runs.push({ item, output, latencyMs });
      onItem?.(variant, index);
    }

    results.push({
      model: variant.name,
      reasoning: variant.reasoning ?? false,
      runs,
      latency: latencyStats(runs.map((run) => run.latencyMs)),
    });
  }

  return results;
};
