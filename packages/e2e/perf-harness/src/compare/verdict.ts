//
// Copyright 2026 DXOS.org
//

import { type Direction } from '../score/score.ts';
import {
  type MeasureOptions,
  RUN_GROUP,
  STAGE_CPU_GROUP,
  STAGE_WALL_GROUP,
  type StageEvent,
  WORK_GROUP,
  toReadings,
} from '../score/stages.ts';
import { LARGE_CLIFFS_DELTA, cliffsDelta, mean, median, tInterval } from './stats.ts';

export type Verdict = 'improved' | 'regressed' | 'no-change' | 'inconclusive';

/** Exit codes, so a script or `git bisect run` reads the verdict without parsing text. */
export const EXIT_CODE = {
  'improved': 0,
  'regressed': 1,
  'no-change': 2,
  'inconclusive': 3,
  'error': 4,
} as const satisfies Record<Verdict | 'error', number>;

/** The smallest change worth acting on: the larger of a fraction of the base and an absolute floor. */
export type Threshold = { relative: number; absolute: number };

/** Counts get the nightly's own floor (5% and one count); stage timings move ~10% between rounds even when paired. */
export const DEFAULT_THRESHOLDS: Readonly<Record<string, Threshold>> = {
  [WORK_GROUP]: { relative: 0.05, absolute: 1 },
  [STAGE_WALL_GROUP]: { relative: 0.1, absolute: 20 },
  [STAGE_CPU_GROUP]: { relative: 0.1, absolute: 20 },
  [RUN_GROUP]: { relative: 0.05, absolute: 1 },
};

/** Fewer paired rounds than this decide nothing, however far apart they are. */
export const MIN_PAIRS = 3;

/** One round's value of each metric. */
export type RoundReadings = Map<string, { group: string; value: number }>;

/** A round is one iteration of one arm, so each metric has one value; a stage repeated in a round is reduced by median. */
export const toRoundReadings = (events: ReadonlyArray<StageEvent>, options?: MeasureOptions): RoundReadings =>
  new Map(toReadings(events, options).map(({ id, group, values }) => [id, { group, value: median(values) }]));

export type MetricComparison = {
  id: string;
  group: string;
  /** Medians of each arm over the paired rounds. */
  base: number;
  candidate: number;
  /** Mean of candidate − base over paired rounds, and its Student-t interval. */
  shift: number;
  interval: [number, number];
  /** Cliff's delta, candidate vs base. */
  delta: number;
  /** The absolute threshold the interval was judged against. */
  threshold: number;
  pairs: number;
  verdict: Verdict;
};

export type CompareMetricOptions = {
  id: string;
  group: string;
  /** `[base, candidate]` per round; pairing by round cancels the drift a machine shows across a session. */
  pairs: ReadonlyArray<readonly [number, number]>;
  threshold: Threshold;
  direction?: Direction;
  /** Of the interval; raised above 0.95 when several metrics share one verdict. */
  confidence?: number;
};

/**
 * Judges one metric: improved or regressed only when the whole interval clears the threshold and the
 * effect is large; no change only when the whole interval sits inside it; inconclusive otherwise.
 */
export const compareMetric = ({
  id,
  group,
  pairs,
  threshold,
  direction = 'lower',
  confidence = 0.95,
}: CompareMetricOptions): MetricComparison => {
  const bases = pairs.map(([base]) => base);
  const candidates = pairs.map(([, candidate]) => candidate);
  const differences = pairs.map(([base, candidate]) => candidate - base);
  const base = median(bases);
  const limit = Math.max(threshold.relative * Math.abs(base), threshold.absolute);
  const shift = mean(differences);
  // A counter that read the same in every round of each arm is deterministic here, and its shift exact.
  const deterministic = pairs.length >= 3 && new Set(bases).size === 1 && new Set(candidates).size === 1;
  const interval: [number, number] = deterministic
    ? [differences[0], differences[0]]
    : tInterval(differences, confidence);
  const delta = cliffsDelta(bases, candidates);

  const verdict = ((): Verdict => {
    if (pairs.length < MIN_PAIRS) {
      return 'inconclusive';
    }
    const [low, high] = interval;
    const large = Math.abs(delta) >= LARGE_CLIFFS_DELTA;
    const up = low > limit && large;
    const down = high < -limit && large;
    if (up || down) {
      return up === (direction === 'lower') ? 'regressed' : 'improved';
    }
    return low > -limit && high < limit ? 'no-change' : 'inconclusive';
  })();

  return {
    id,
    group,
    base,
    candidate: median(candidates),
    shift,
    interval,
    delta,
    threshold: limit,
    pairs: pairs.length,
    verdict,
  };
};

export type CompareRoundsOptions = {
  /** Round `i` of each arm ran back to back in the same session; a round either arm lost is dropped. */
  base: ReadonlyArray<RoundReadings>;
  candidate: ReadonlyArray<RoundReadings>;
  thresholds?: Readonly<Record<string, Threshold>>;
  /** The metrics the verdict rests on; they share `familyAlpha`, so more of them need more rounds. */
  isTarget?: (id: string) => boolean;
  /** Chance of any false call across the targets, split evenly between them (Bonferroni). */
  familyAlpha?: number;
};

/** Compares every metric both arms measured in at least one common round. */
export const compareRounds = ({
  base,
  candidate,
  thresholds = DEFAULT_THRESHOLDS,
  isTarget = () => false,
  familyAlpha = 0.05,
}: CompareRoundsOptions): MetricComparison[] => {
  const rounds = Math.min(base.length, candidate.length);
  const ids = new Map<string, string>();
  for (let round = 0; round < rounds; ++round) {
    for (const [id, { group }] of base[round]) {
      if (candidate[round].has(id)) {
        ids.set(id, group);
      }
    }
  }
  const targets = [...ids.keys()].filter(isTarget).length;
  return [...ids].map(([id, group]) => {
    const pairs: Array<readonly [number, number]> = [];
    for (let round = 0; round < rounds; ++round) {
      const left = base[round].get(id);
      const right = candidate[round].get(id);
      if (left && right) {
        pairs.push([left.value, right.value]);
      }
    }
    return compareMetric({
      id,
      group,
      pairs,
      threshold: thresholds[group] ?? thresholds[RUN_GROUP],
      confidence: 1 - (isTarget(id) ? familyAlpha / Math.max(1, targets) : familyAlpha),
    });
  });
};

/** Any regression decides; then any unresolved metric; then any improvement. Nothing judged is inconclusive. */
export const overallVerdict = (verdicts: ReadonlyArray<Verdict>): Verdict =>
  verdicts.length === 0
    ? 'inconclusive'
    : verdicts.includes('regressed')
      ? 'regressed'
      : verdicts.includes('inconclusive')
        ? 'inconclusive'
        : verdicts.includes('improved')
          ? 'improved'
          : 'no-change';

/** `*` matches any run of characters; ids look like `wall > boot` or `reactRenders > open-tasks`. */
export const metricMatcher = (patterns: ReadonlyArray<string>): ((id: string) => boolean) => {
  const expressions = patterns.map(
    (pattern) =>
      new RegExp(
        `^${pattern
          .split('*')
          .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
          .join('.*')}$`,
      ),
  );
  return (id) => expressions.some((expression) => expression.test(id));
};
