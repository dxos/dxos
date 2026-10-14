//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { toScoreEvents } from './events.ts';
import {
  type Budget,
  LIMIT_SCORE,
  MAX_SCORE,
  MIN_SCORE,
  geometricMean,
  parseBudgets,
  scoreMeasurements,
  scoreValue,
  statusOf,
  validateBudget,
} from './score.ts';

const budget: Budget = { target: 100, limit: 150, unit: 'ms' };

describe('scoreValue', () => {
  test('caps at the maximum at or better than the target', ({ expect }) => {
    expect(scoreValue(100, budget)).toBe(MAX_SCORE);
    expect(scoreValue(10, budget)).toBe(MAX_SCORE);
  });

  test('scores the limit at the limit score', ({ expect }) => {
    expect(scoreValue(150, budget)).toBeCloseTo(LIMIT_SCORE, 10);
  });

  test('decays by whole budget bands in log space', ({ expect }) => {
    expect(scoreValue(150 * 1.5, budget)).toBeCloseTo(0.2, 10);
    expect(scoreValue(150 * 1.5 * 1.5, budget)).toBeCloseTo(0.1, 10);
  });

  test('is flat just past the target, so noise there costs little', ({ expect }) => {
    expect(scoreValue(102, budget)).toBeGreaterThan(0.995);
  });

  test('decreases monotonically and stops at the floor', ({ expect }) => {
    const scores = [100, 120, 150, 300, 1_000, 1e9].map((value) => scoreValue(value, budget));
    expect(scores).toEqual([...scores].sort((left, right) => right - left));
    expect(scores.at(-1)).toBe(MIN_SCORE);
  });

  test('mirrors for a higher-is-better budget', ({ expect }) => {
    const throughput: Budget = { target: 1_000, limit: 500, unit: 'ops/s', direction: 'higher' };
    expect(scoreValue(2_000, throughput)).toBe(MAX_SCORE);
    expect(scoreValue(500, throughput)).toBeCloseTo(LIMIT_SCORE, 10);
    expect(statusOf(400, throughput)).toBe('over');
  });

  test('scores a missing reading at the floor and a measured zero by direction', ({ expect }) => {
    expect(scoreValue(Number.NaN, budget)).toBe(MIN_SCORE);
    expect(scoreValue(-1, budget)).toBe(MIN_SCORE);
    expect(scoreValue(0, budget)).toBe(MAX_SCORE);
    expect(scoreValue(0, { target: 100, limit: 50, unit: 'ops/s', direction: 'higher' })).toBe(MIN_SCORE);
  });
});

describe('statusOf', () => {
  test('places a value against the range', ({ expect }) => {
    expect(statusOf(90, budget)).toBe('good');
    expect(statusOf(150, budget)).toBe('expected');
    expect(statusOf(151, budget)).toBe('over');
  });
});

describe('validateBudget', () => {
  test('rejects an empty or inverted range', ({ expect }) => {
    expect(() => validateBudget('x', { target: 100, limit: 100, unit: 'ms' })).toThrow(/worse than target/);
    expect(() => validateBudget('x', { target: 100, limit: 50, unit: 'ms' })).toThrow(/worse than target/);
    expect(() => validateBudget('x', { target: 0, limit: 50, unit: 'ms' })).toThrow(/positive/);
  });

  test('rejects a non-finite weight', ({ expect }) => {
    expect(() =>
      validateBudget('x', { target: 100, limit: 150, unit: 'ms', weight: Number.POSITIVE_INFINITY }),
    ).toThrow(/weight/);
  });
});

describe('parseBudgets', () => {
  test('reads a budget file and rejects a malformed entry by id', ({ expect }) => {
    expect(parseBudgets({ a: { target: 1, limit: 2, unit: 'ms', weight: 0.5 } })).toEqual({
      a: { target: 1, limit: 2, unit: 'ms', weight: 0.5 },
    });
    expect(() => parseBudgets({ a: { target: 1, limit: 2, unit: 'years' } })).toThrow(/budget a/);
    expect(() => parseBudgets({ a: { target: 2, limit: 1, unit: 'ms' } })).toThrow(/worse than target/);
    expect(() => parseBudgets([])).toThrow(/keyed by metric id/);
  });
});

describe('scoreMeasurements', () => {
  test('rolls up per group, then across groups with equal weight', ({ expect }) => {
    const budgets = { a: budget, b: budget, c: budget };
    const report = scoreMeasurements(
      [
        { id: 'a', group: 'big', value: 100 },
        { id: 'b', group: 'big', value: 100 },
        { id: 'c', group: 'small', value: 150 },
      ],
      budgets,
    );
    expect(report.groups.map(({ group, score }) => [group, score])).toEqual([
      ['big', expect.closeTo(MAX_SCORE, 10)],
      ['small', expect.closeTo(LIMIT_SCORE, 10)],
    ]);
    // Equal weight per group: sqrt(100 * 50), not the three-row mean.
    expect(report.overall).toBeCloseTo(Math.sqrt(MAX_SCORE * LIMIT_SCORE), 10);
  });

  test('reports measurements with no budget instead of scoring them', ({ expect }) => {
    const report = scoreMeasurements([{ id: 'missing', group: 'g', value: 1 }], {});
    expect(report.unbudgeted).toHaveLength(1);
    expect(report.overall).toBe(MAX_SCORE);
  });

  test('scores a budget with no measurement at the floor only when asked', ({ expect }) => {
    const budgets = { present: budget, failed: budget };
    const measurements = [{ id: 'present', group: 'g', value: 100 }];
    expect(scoreMeasurements(measurements, budgets).overall).toBeCloseTo(MAX_SCORE, 10);
    const strict = scoreMeasurements(measurements, budgets, { scoreMissing: { groupOf: () => 'g' } });
    expect(strict.missing).toEqual(['failed']);
    expect(strict.overall).toBeCloseTo(Math.sqrt(MAX_SCORE * MIN_SCORE), 10);
  });

  test('weights a metric within its group', ({ expect }) => {
    expect(
      geometricMean([
        { score: 1, weight: 3 },
        { score: 0.1, weight: 1 },
      ]),
    ).toBeCloseTo(0.1 ** 0.25, 10);
  });
});

describe('toScoreEvents', () => {
  test('emits a row per metric, per group and overall, each with a distinct dedup key', ({ expect }) => {
    const report = scoreMeasurements([{ id: 'a', group: 'g', value: 120 }], { a: budget });
    const events = toScoreEvents(report, { suite: 'echo' });
    expect(events.map(({ properties }) => properties.kind)).toEqual(['metric', 'group', 'overall']);
    expect(new Set(events.map(({ dedup }) => dedup)).size).toBe(events.length);
    expect(events[0].properties).toMatchObject({ metric: 'a', target: 100, limit: 150, status: 'expected' });
  });
});
