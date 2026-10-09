//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { STAGE_WALL_GROUP, type StageEvent, WORK_GROUP } from '../score/stages.ts';
import {
  type RoundReadings,
  compareMetric,
  compareRounds,
  metricMatcher,
  overallVerdict,
  toRoundReadings,
} from './verdict.ts';

const WORK = { relative: 0.05, absolute: 1 };
const TIMING = { relative: 0.1, absolute: 20 };

const paired = (base: number[], candidate: number[]) => base.map((value, index) => [value, candidate[index]] as const);

describe('compare verdict', () => {
  test('a count that rises in every round regressed', ({ expect }) => {
    const result = compareMetric({
      id: 'reactRenders > open-tasks',
      group: WORK_GROUP,
      pairs: paired([100, 100, 100, 100, 100, 100], [140, 140, 140, 140, 140, 140]),
      threshold: WORK,
    });
    expect(result.verdict).toBe('regressed');
    expect(result.shift).toBe(40);
    expect(result.delta).toBe(1);
  });

  test('a count that falls in every round improved', ({ expect }) => {
    const result = compareMetric({
      id: 'reactRenders > open-tasks',
      group: WORK_GROUP,
      pairs: paired([100, 100, 100, 100, 100, 100], [60, 60, 60, 60, 60, 60]),
      threshold: WORK,
    });
    expect(result.verdict).toBe('improved');
  });

  test('identical arms are no change', ({ expect }) => {
    const result = compareMetric({
      id: 'wall > boot',
      group: STAGE_WALL_GROUP,
      pairs: paired([1000, 1010, 990, 1005, 1000, 995], [1002, 1008, 995, 1000, 1003, 990]),
      threshold: TIMING,
    });
    expect(result.verdict).toBe('no-change');
  });

  test('a shift inside the noise is inconclusive, not a win', ({ expect }) => {
    const result = compareMetric({
      id: 'wall > open-space',
      group: STAGE_WALL_GROUP,
      pairs: paired([1000, 1400, 900, 1600, 1100, 1200], [800, 1500, 700, 1200, 1300, 1000]),
      threshold: TIMING,
    });
    expect(result.verdict).toBe('inconclusive');
  });

  test('two rounds decide nothing, however far apart', ({ expect }) => {
    const result = compareMetric({
      id: 'wall > boot',
      group: STAGE_WALL_GROUP,
      pairs: paired([1000, 1100], [2000, 2100]),
      threshold: TIMING,
    });
    expect(result.verdict).toBe('inconclusive');
  });

  test('a counter steady in every round of each arm is deterministic, and decided from three rounds', ({ expect }) => {
    const changed = compareMetric({
      id: 'layoutCount > scroll-tasks',
      group: WORK_GROUP,
      pairs: paired([24, 24, 24], [30, 30, 30]),
      threshold: WORK,
    });
    const same = compareMetric({
      id: 'layoutCount > scroll-tasks',
      group: WORK_GROUP,
      pairs: paired([24, 24, 24], [24, 24, 24]),
      threshold: WORK,
      confidence: 1 - 0.05 / 45,
    });
    expect(changed.verdict).toBe('regressed');
    expect(same.verdict).toBe('no-change');
  });

  test('a metric that flips between two levels in identical arms is not a regression', ({ expect }) => {
    // reactRenders > open-space in an A/A run: each run lands near 1,690 or near 2,250.
    const result = compareMetric({
      id: 'reactRenders > open-space',
      group: WORK_GROUP,
      pairs: paired([1690, 1690, 2250, 1690, 1690, 2250], [2250, 2250, 2250, 1690, 2250, 2250]),
      threshold: WORK,
    });
    expect(result.verdict).toBe('inconclusive');
  });

  test('higher-is-better flips the direction', ({ expect }) => {
    const result = compareMetric({
      id: 'ops',
      group: WORK_GROUP,
      pairs: paired([100, 100, 100, 100, 100, 100], [150, 150, 150, 150, 150, 150]),
      threshold: WORK,
      direction: 'higher',
    });
    expect(result.verdict).toBe('improved');
  });

  test('pairs rounds by index and drops a round either arm lost', ({ expect }) => {
    const round = (value: number): RoundReadings => new Map([['wall > boot', { group: STAGE_WALL_GROUP, value }]]);
    const [comparison] = compareRounds({
      base: [round(1000), round(1000), new Map(), round(1000), round(1000), round(1000), round(1000)],
      candidate: Array.from({ length: 7 }, () => round(2000)),
    });
    expect(comparison.pairs).toBe(6);
    expect(comparison.verdict).toBe('regressed');
  });

  test('each extra target needs more rounds, since targets share one false-call budget', ({ expect }) => {
    const baseNoise = [0, 3, -2, 1, -1, 2];
    const candidateNoise = [2, -1, 3, 0, -2, 1];
    const rounds = (noise: number[], offset: number): RoundReadings[] =>
      noise.map(
        (jitter) =>
          new Map([
            ['reactRenders > boot', { group: WORK_GROUP, value: 100 + offset + jitter }],
            ['reactRenders > open-tasks', { group: WORK_GROUP, value: 100 + offset + jitter }],
          ]),
      );
    const base = rounds(baseNoise, 0);
    const candidate = rounds(candidateNoise, 8.5);
    const alone = compareRounds({ base, candidate, isTarget: (id) => id.endsWith('boot') });
    const shared = compareRounds({ base, candidate, isTarget: () => true });
    expect(alone.find(({ id }) => id.endsWith('boot'))?.verdict).toBe('regressed');
    expect(shared.every(({ verdict }) => verdict === 'inconclusive')).toBe(true);
  });

  test('round readings carry one value per metric', ({ expect }) => {
    const events: StageEvent[] = [
      { properties: { stage: 'boot', iteration: 0, wallMs: 1200, cpuMsTotal: 900, reactRenders: 50 } },
    ];
    const readings = toRoundReadings(events);
    expect(readings.get('wall > boot')).toEqual({ group: STAGE_WALL_GROUP, value: 1200 });
    expect(readings.get('reactRenders > boot')).toEqual({ group: WORK_GROUP, value: 50 });
  });

  test('overall verdict: regression first, then unresolved, then improvement', ({ expect }) => {
    expect(overallVerdict(['improved', 'regressed', 'inconclusive'])).toBe('regressed');
    expect(overallVerdict(['improved', 'inconclusive'])).toBe('inconclusive');
    expect(overallVerdict(['improved', 'no-change'])).toBe('improved');
    expect(overallVerdict(['no-change'])).toBe('no-change');
    expect(overallVerdict([])).toBe('inconclusive');
  });

  test('metric patterns match whole ids with * wildcards', ({ expect }) => {
    const matches = metricMatcher(['wall > *', 'reactRenders > open-tasks']);
    expect(matches('wall > boot')).toBe(true);
    expect(matches('reactRenders > open-tasks')).toBe(true);
    expect(matches('reactRenders > boot')).toBe(false);
    expect(matches('cpu > wall > boot')).toBe(false);
  });
});
