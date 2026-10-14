//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import path from 'node:path';

import { type Budget, type Measurement } from '@dxos/perf-harness/score';

/** The parts of `vitest bench --outputJson` the scorer reads; anything else in the file is ignored. */
export const BenchJsonReport = Schema.Struct({
  files: Schema.Array(
    Schema.Struct({
      filepath: Schema.String,
      groups: Schema.Array(
        Schema.Struct({
          fullName: Schema.String,
          benchmarks: Schema.Array(
            Schema.Struct({
              name: Schema.String,
              median: Schema.optional(Schema.Number),
              mean: Schema.Number,
              rme: Schema.Number,
            }),
          ),
        }),
      ),
    }),
  ),
});
export type BenchJsonReport = Schema.Schema.Type<typeof BenchJsonReport>;

/** The file a benchmark lives in, without directory or `.bench.ts`: the group it scores under. */
const fileGroup = (filepath: string): string => path.basename(filepath).replace(/\.bench\.[cm]?[jt]s$/, '');

/** The describe path below the file; vitest prefixes it with the file's relative path. */
const suitePath = (fullName: string, filepath: string): string => {
  const segments = fullName.split(' > ');
  const file = path.basename(filepath);
  return (segments[0] && path.basename(segments[0]) === file ? segments.slice(1) : segments).join(' > ');
};

/** The stable id a benchmark's budget is filed under and its dashboard series is named by. */
export const benchmarkId = (filepath: string, fullName: string, name: string): string =>
  [fileGroup(filepath), suitePath(fullName, filepath), name].filter(Boolean).join(' > ');

/**
 * One measurement per benchmark: its median time in ms, which a slow outlier iteration cannot drag
 * the way it drags the mean; tinybench reports the mean only when it has no median.
 */
export const toMeasurements = (report: BenchJsonReport): Measurement[] =>
  report.files.flatMap(({ filepath, groups }) =>
    groups.flatMap(({ fullName, benchmarks }) =>
      benchmarks.map(({ name, median, mean }) => ({
        id: benchmarkId(filepath, fullName, name),
        group: fileGroup(filepath),
        value: median ?? mean,
      })),
    ),
  );

export type CalibrateOptions = {
  /** Multiple of the measured value the target sits at. */
  headroom: number;
  /** Multiple of the target the limit sits at, before widening for noise. */
  band: number;
};

/**
 * Proposes a budget per measurement: the target a little above what was measured, and the limit a
 * band above that, widened by the row's own relative margin of error so a noisy row is not scored
 * on its noise. A proposal to review, not a verdict: the values come from one run on one machine.
 */
export const proposeBudgets = (
  report: BenchJsonReport,
  { headroom, band }: CalibrateOptions,
): Record<string, Budget> => {
  const budgets: Record<string, Budget> = {};
  for (const { filepath, groups } of report.files) {
    for (const { fullName, benchmarks } of groups) {
      for (const { name, median, mean, rme } of benchmarks) {
        const value = median ?? mean;
        const target = Number((value * headroom).toPrecision(3));
        const width = Math.max(band, 1 + (3 * rme) / 100);
        budgets[benchmarkId(filepath, fullName, name)] = {
          target,
          limit: Number((target * width).toPrecision(3)),
          unit: 'ms',
        };
      }
    }
  }
  return budgets;
};
