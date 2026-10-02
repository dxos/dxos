//
// Copyright 2026 DXOS.org
//

//
// Budget scoring for trended performance numbers.
//
// A metric's budget is two values on its own scale: `target`, the value we want, and `limit`, the
// worst value still inside the expected range. Scores run 0–1. A metric at or better than its target
// scores 1 — capped, so beating one budget by a mile cannot hide a regression in another. Past the
// target the score decays in log space, `1 / (1 + x²)` with `x = ln(value / target) / ln(limit / target)`:
//
//   value    target   limit   limit·band   limit·band²
//   score       1.0     0.5          0.2           0.1        (floored at 0.01)
//
// Log space because performance moves by ratios — 2× slower is the same regression at 1ms and 1s —
// and the curve is flat at the target, so noise just above it costs almost nothing, while a doubling
// past the limit still reads as a steady decline rather than falling off a cliff.
//
// Scores combine by weighted geometric mean, the convention of SPEC, JetStream and Speedometer: it
// is scale-free, and halving any one score costs the overall the same factor whichever metric it
// was. It is taken per group first and then across groups, so a group with fifty rows does not
// outvote a group with four. The floor keeps one dead metric from zeroing the whole product.
//

/** Which way is better. Time, bytes and counts are `lower`; throughput is `higher`. */
export type Direction = 'lower' | 'higher';

/** Unit a budget's values are in; for display only, scoring is unit-free. */
export type Unit = 'ns' | 'µs' | 'ms' | 'bytes' | 'count' | 'ops/s';

export type Budget = {
  /** The desired value: at or better than it scores {@link MAX_SCORE}. */
  target: number;
  /** The worst value inside the expected range: scores {@link LIMIT_SCORE}. */
  limit: number;
  unit: Unit;
  /** Defaults to `lower`. */
  direction?: Direction;
  /** Weight within its group; defaults to 1. */
  weight?: number;
};

export const MAX_SCORE = 1;
export const LIMIT_SCORE = 0.5;
export const MIN_SCORE = 0.01;

/** Where a value sits against its budget: better than the target, inside the range, or past it. */
export type Status = 'good' | 'expected' | 'over';

const UNITS: ReadonlyArray<Unit> = ['ns', 'µs', 'ms', 'bytes', 'count', 'ops/s'];
const DIRECTIONS: ReadonlyArray<Direction> = ['lower', 'higher'];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Reads a budget file's parsed JSON, `{ [id]: Budget }`, rejecting anything malformed by id. */
export const parseBudgets = (json: unknown): Record<string, Budget> => {
  if (!isRecord(json)) {
    throw new Error('budgets: expected an object keyed by metric id');
  }
  const budgets: Record<string, Budget> = {};
  for (const [id, entry] of Object.entries(json)) {
    if (!isRecord(entry)) {
      throw new Error(`budget ${id}: expected an object`);
    }
    const { target, limit, unit, direction, weight } = entry;
    const knownUnit = UNITS.find((candidate) => candidate === unit);
    const knownDirection = DIRECTIONS.find((candidate) => candidate === direction);
    if (typeof target !== 'number' || typeof limit !== 'number' || !knownUnit) {
      throw new Error(`budget ${id}: needs numeric target and limit and a unit in ${UNITS.join(', ')}`);
    }
    if ((direction !== undefined && !knownDirection) || (weight !== undefined && typeof weight !== 'number')) {
      throw new Error(`budget ${id}: direction must be lower or higher, and weight a number`);
    }
    const budget: Budget = {
      target,
      limit,
      unit: knownUnit,
      ...(knownDirection ? { direction: knownDirection } : {}),
      ...(typeof weight === 'number' ? { weight } : {}),
    };
    validateBudget(id, budget);
    budgets[id] = budget;
  }
  return budgets;
};

/** Rejects a budget whose range is empty or inverted, which would make every score meaningless. */
export const validateBudget = (id: string, budget: Budget): void => {
  const { target, limit, direction = 'lower', weight = 1 } = budget;
  if (!(target > 0 && limit > 0 && Number.isFinite(target) && Number.isFinite(limit))) {
    throw new Error(`budget ${id}: target and limit must be positive and finite`);
  }
  if (direction === 'lower' ? limit <= target : limit >= target) {
    throw new Error(`budget ${id}: limit ${limit} must be worse than target ${target} for direction ${direction}`);
  }
  if (!(weight > 0)) {
    throw new Error(`budget ${id}: weight must be positive`);
  }
};

/** How many budget bands past the target `value` is, in log space; 0 at or better than the target. */
const excess = (value: number, { target, limit, direction = 'lower' }: Budget): number => {
  const ratio = direction === 'lower' ? value / target : target / value;
  const band = direction === 'lower' ? limit / target : target / limit;
  return ratio <= 1 ? 0 : Math.log(ratio) / Math.log(band);
};

/** The 0–1 score of one value against its budget. */
export const scoreValue = (value: number, budget: Budget): number => {
  if (!(value > 0) || !Number.isFinite(value)) {
    // Zero or a missing reading cannot be placed on a log scale; it is not evidence of speed.
    return MIN_SCORE;
  }
  const steps = excess(value, budget);
  return Math.max(MIN_SCORE, MAX_SCORE / (1 + steps * steps));
};

export const statusOf = (value: number, budget: Budget): Status => {
  const steps = excess(value, budget);
  return steps === 0 ? 'good' : steps <= 1 ? 'expected' : 'over';
};

export type Measurement = {
  /** Stable id: the key the budget is filed under and the dashboard series name. */
  id: string;
  group: string;
  value: number;
};

export type ScoredMetric = Measurement & { budget: Budget; score: number; status: Status };

export type GroupScore = { group: string; score: number; metrics: number; over: number };

export type ScoreReport = {
  overall: number;
  groups: GroupScore[];
  metrics: ScoredMetric[];
  /** Measurements with no budget: scoring them would need a target nobody chose. */
  unbudgeted: Measurement[];
  /** Budgets nothing was measured for; scored at {@link MIN_SCORE} under `scoreMissing`. */
  missing: string[];
};

export type ScoreOptions = {
  /**
   * Score a budget with no measurement at the floor, in the group its id names. For a flow, where a
   * missing stage is a stage that failed, rather than a bench that was renamed.
   */
  scoreMissing?: { groupOf: (id: string) => string };
};

/** Weighted geometric mean; empty input is the maximum, since nothing measured is over budget. */
export const geometricMean = (entries: ReadonlyArray<{ score: number; weight: number }>): number => {
  const totalWeight = entries.reduce((total, { weight }) => total + weight, 0);
  if (totalWeight === 0) {
    return MAX_SCORE;
  }
  const logSum = entries.reduce((total, { score, weight }) => total + weight * Math.log(score), 0);
  return Math.exp(logSum / totalWeight);
};

/** Scores every measurement against `budgets` and rolls them up per group and overall. */
export const scoreMeasurements = (
  measurements: ReadonlyArray<Measurement>,
  budgets: Readonly<Record<string, Budget>>,
  { scoreMissing }: ScoreOptions = {},
): ScoreReport => {
  const metrics: ScoredMetric[] = [];
  const unbudgeted: Measurement[] = [];
  for (const measurement of measurements) {
    const budget = budgets[measurement.id];
    if (!budget) {
      unbudgeted.push(measurement);
      continue;
    }
    validateBudget(measurement.id, budget);
    metrics.push({
      ...measurement,
      budget,
      score: scoreValue(measurement.value, budget),
      status: statusOf(measurement.value, budget),
    });
  }

  const measured = new Set(measurements.map(({ id }) => id));
  const missing = Object.keys(budgets).filter((id) => !measured.has(id));
  if (scoreMissing) {
    for (const id of missing) {
      const budget = budgets[id];
      validateBudget(id, budget);
      metrics.push({
        id,
        group: scoreMissing.groupOf(id),
        value: Number.NaN,
        budget,
        score: MIN_SCORE,
        status: 'over',
      });
    }
  }

  const byGroup = new Map<string, ScoredMetric[]>();
  for (const metric of metrics) {
    byGroup.set(metric.group, [...(byGroup.get(metric.group) ?? []), metric]);
  }
  const groups = [...byGroup].map(([group, members]): GroupScore => ({
    group,
    score: geometricMean(members.map(({ score, budget }) => ({ score, weight: budget.weight ?? 1 }))),
    metrics: members.length,
    over: members.filter(({ status }) => status === 'over').length,
  }));

  return {
    overall: geometricMean(groups.map(({ score }) => ({ score, weight: 1 }))),
    groups,
    metrics,
    unbudgeted,
    missing,
  };
};
