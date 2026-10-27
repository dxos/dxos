//
// Copyright 2026 DXOS.org
//

import { type Budget } from './score.ts';
import { DEFAULT_WORK_METRICS, type StageEvent, type WorkMetric, workReadings } from './stages.ts';

export type WorkCalibrationOptions = {
  /** The work counters to propose budgets for. */
  work?: ReadonlyArray<WorkMetric>;
  /** Stages whose counts depend on what arrived over the network rather than on the code; never budgeted. */
  skipStages?: ReadonlyArray<string>;
  /** The largest per-iteration coefficient of variation a counter may show and still get a tight budget. */
  maxSpread?: number;
  /** How many measured spreads the limit sits above the target. */
  bands?: number;
  /** The least headroom, so a counter that never moved still tolerates a few percent. */
  minHeadroom?: number;
};

export const DEFAULT_SKIP_STAGES: ReadonlyArray<string> = ['seed', 'await-replication'];

const median = (values: readonly number[]): number => {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

const coefficientOfVariation = (values: readonly number[]): number => {
  const mean = values.reduce((total, value) => total + value, 0) / values.length;
  if (values.length < 2 || mean === 0) {
    return 0;
  }
  const variance = values.reduce((total, value) => total + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance) / mean;
};

/** Three significant figures, so a proposal does not pretend to more precision than one night gives. */
const round = (value: number): number => Number(value.toPrecision(3));

/**
 * Proposes a budget for every work counter that is deterministic enough to hold one, from several
 * runs of the same flow (one batch of iterations each).
 *
 * The target is the median across runs of each run's median. The spread is the larger of the
 * run-to-run CV of those medians and the per-iteration CV shrunk by √n — the latter alone, since two
 * or three runs give a poor estimate of the former. The limit sits `bands` spreads above the target,
 * never less than `minHeadroom` and never less than one more count. A counter is left out when it is
 * zero in any run (the log scale cannot place a zero, and a stage that does none of that work has
 * nothing to regress from), absent from any run, or noisier per iteration than `maxSpread`.
 */
export const proposeWorkBudgets = (
  runs: ReadonlyArray<ReadonlyArray<StageEvent>>,
  {
    work = DEFAULT_WORK_METRICS,
    skipStages = DEFAULT_SKIP_STAGES,
    maxSpread = 0.05,
    bands = 3,
    minHeadroom = 0.05,
  }: WorkCalibrationOptions = {},
): Record<string, Budget> => {
  const perRun = runs.map((events) => workReadings(events, work));
  const ids = new Set(perRun.flatMap((readings) => [...readings.keys()]));
  const budgets: Record<string, Budget> = {};
  for (const id of [...ids].sort()) {
    const [name, stage] = id.split(' > ');
    if (skipStages.includes(stage)) {
      continue;
    }
    const samples = perRun.map((readings) => readings.get(id) ?? []);
    if (samples.some((values) => values.length === 0)) {
      continue;
    }
    const medians = samples.map(median);
    if (medians.some((value) => value <= 0)) {
      continue;
    }
    const withinSpread = Math.max(...samples.map(coefficientOfVariation));
    if (withinSpread > maxSpread) {
      continue;
    }
    const iterations = Math.min(...samples.map((values) => values.length));
    const spread = Math.max(coefficientOfVariation(medians), withinSpread / Math.sqrt(iterations));
    const target = round(median(medians));
    const limit = Math.max(round(target * (1 + Math.max(minHeadroom, bands * spread))), Math.ceil(target) + 1);
    budgets[id] = { target, limit, unit: name.endsWith('Bytes') ? 'bytes' : 'count' };
  }
  return budgets;
};
