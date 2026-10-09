//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { cliffsDelta, median, seededRandom, studentQuantile, tInterval } from './stats.ts';

describe('compare stats', () => {
  test('seeded random repeats its sequence', ({ expect }) => {
    const left = seededRandom(7);
    const right = seededRandom(7);
    const values = Array.from({ length: 5 }, () => left());
    expect(values).toEqual(Array.from({ length: 5 }, () => right()));
    expect(values.every((value) => value >= 0 && value < 1)).toBe(true);
  });

  test('median of odd and even lengths', ({ expect }) => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([])).toBeNaN();
  });

  test('Student t quantiles match the tables', ({ expect }) => {
    expect(studentQuantile(0.975, 1)).toBeCloseTo(12.706, 3);
    expect(studentQuantile(0.975, 4)).toBeCloseTo(2.776, 3);
    expect(studentQuantile(0.975, 30)).toBeCloseTo(2.042, 3);
  });

  test('t interval of the mean', ({ expect }) => {
    const [low, high] = tInterval([1, 2, 3, 4, 5]);
    expect(low).toBeCloseTo(1.037, 3);
    expect(high).toBeCloseTo(4.963, 3);
    expect(tInterval([5, 5, 5])).toEqual([5, 5]);
    expect(tInterval([5])).toEqual([Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY]);
  });

  test('a stricter confidence widens the interval', ({ expect }) => {
    const values = [10, 12, 9, 11, 10, 13];
    const [low95, high95] = tInterval(values, 0.95);
    const [low99, high99] = tInterval(values, 1 - 0.05 / 45);
    expect(low99).toBeLessThan(low95);
    expect(high99).toBeGreaterThan(high95);
  });

  test("Cliff's delta is 1 for a fully separated larger candidate and 0 for identical samples", ({ expect }) => {
    expect(cliffsDelta([1, 2, 3], [4, 5, 6])).toBe(1);
    expect(cliffsDelta([4, 5, 6], [1, 2, 3])).toBe(-1);
    expect(cliffsDelta([1, 2, 3], [1, 2, 3])).toBe(0);
  });
});
