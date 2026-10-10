//
// Copyright 2026 DXOS.org
//

import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { type Attached, type Cdp } from '../cdp.ts';
import { type RealmCalls } from '../types.ts';

/** Bounds every coverage command: a dying worker stays listed and never answers. */
const COVERAGE_TIMEOUT_MS = 30_000;

/** Functions per realm kept in the stage artifact. */
const TOP_N = 50;

type CoverageRange = { startOffset: number; count: number };
type FunctionCoverage = { functionName: string; ranges: CoverageRange[] };
type ScriptCoverage = { url: string; functions: FunctionCoverage[] };

/** One function's calls over the stage, as the artifact lists it. */
export type FunctionCalls = { name: string; script: string; offset: number; calls: number };

export type CallCounter = {
  /** Starts counting in any realm not yet counting, then zeroes every realm's counters. */
  beginStage: (targets: Attached[]) => Promise<void>;
  /** Reads (and zeroes) every realm's counters, writing the stage's top functions as an artifact. */
  endStage: (stage: string) => Promise<{ calls: RealmCalls[]; file?: string }>;
};

/**
 * A function's calls. With `callCount` and without `detailed`, V8 reports one range per function
 * whose count is its invocation count — exact, not sampled.
 */
const callsOf = (fn: FunctionCoverage): number => fn.ranges[0]?.count ?? 0;

/** The script's file name, so the artifact is readable without the bundle's hash-laden URL. */
const scriptName = (url: string): string => url.split('?')[0].split('/').pop() || url || '(anonymous)';

/**
 * Exact JS call counts per realm per stage, from V8's precise coverage.
 *
 * Precise rather than sampled, which is the point: the sampling profiler's samples move with
 * machine speed, while the number of times a function was called does not. `detailed: false`
 * because block counts would add instrumentation the function totals do not need.
 *
 * Coverage stays on across stages once started, and `takePreciseCoverage` zeroes the counters as it
 * reads them, so a stage's counts are the read at its end after a discarded read at its start.
 * Enabling it makes V8 allocate feedback vectors eagerly and costs compiled code its inlined call
 * elision, which is why it is opt-in (`DX_PERF_COUNTERS`): its cost was measured, not assumed.
 */
export const startCallCounting = (outputDir: string): CallCounter => {
  const started = new WeakSet<Cdp>();
  let counting: Attached[] = [];

  const take = (target: Attached) =>
    target.cdp.trySend<{ result: ScriptCoverage[] }>(
      'Profiler.takePreciseCoverage',
      {},
      { timeoutMs: COVERAGE_TIMEOUT_MS },
    );

  return {
    beginStage: async (targets) => {
      counting = [];
      for (const target of targets) {
        if (!started.has(target.cdp)) {
          await target.cdp.trySend('Profiler.enable', {}, { timeoutMs: COVERAGE_TIMEOUT_MS });
          const result = await target.cdp.trySend(
            'Profiler.startPreciseCoverage',
            { callCount: true, detailed: false, allowTriggeredUpdates: false },
            { timeoutMs: COVERAGE_TIMEOUT_MS },
          );
          if (result === undefined) {
            continue;
          }
          started.add(target.cdp);
        }
        // Discarded: it zeroes what the realm counted since the last stage ended.
        if ((await take(target)) !== undefined) {
          counting.push(target);
        }
      }
    },

    endStage: async (stage) => {
      const calls: RealmCalls[] = [];
      const top: Record<string, FunctionCalls[]> = {};
      for (const target of counting) {
        const coverage = await take(target);
        if (!coverage) {
          continue;
        }
        let total = 0;
        let functions = 0;
        const called: FunctionCalls[] = [];
        for (const script of coverage.result) {
          for (const fn of script.functions) {
            const count = callsOf(fn);
            if (count === 0) {
              continue;
            }
            total += count;
            functions += 1;
            called.push({
              name: fn.functionName || '(anonymous)',
              script: scriptName(script.url),
              offset: fn.ranges[0].startOffset,
              calls: count,
            });
          }
        }
        calls.push({ kind: target.kind, name: target.name, calls: total, functions });
        top[target.name] = called.sort((left, right) => right.calls - left.calls).slice(0, TOP_N);
      }
      counting = [];
      if (calls.length === 0) {
        return { calls };
      }
      mkdirSync(outputDir, { recursive: true });
      const file = path.join(outputDir, `${stage}-calls.json`);
      writeFileSync(file, JSON.stringify(top, null, 2));
      return { calls, file };
    },
  };
};
