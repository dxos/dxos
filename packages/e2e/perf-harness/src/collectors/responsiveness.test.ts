//
// Copyright 2026 DXOS.org
//

import { createContext, runInContext } from 'node:vm';
import { describe, test } from 'vitest';

import { WORKER_DRAIN_EXPRESSION, WORKER_PROBE_EXPRESSION, percentile } from './responsiveness.ts';

describe('percentile', () => {
  test('nearest-rank does not return the maximum for p95', ({ expect }) => {
    // 20 samples: `floor(0.95 * 20)` is 19, the maximum. Nearest-rank is index 18, so a single
    // outlier stops being reported as the 95th percentile of a trended metric.
    const samples = Array.from({ length: 20 }, (_value, index) => index + 1);
    expect(percentile(samples, 0.95)).toBe(19);
    expect(percentile(samples, 0.95)).not.toBe(20);
  });

  test('clamps at both ends', ({ expect }) => {
    expect(percentile([], 0.95)).toBe(0);
    expect(percentile([7], 0.95)).toBe(7);
    expect(percentile([1, 2, 3, 4], 1)).toBe(4);
    expect(percentile([1, 2, 3, 4], 0)).toBe(1);
  });

  test('is order independent', ({ expect }) => {
    expect(percentile([9, 1, 5, 3, 7], 0.5)).toBe(percentile([1, 3, 5, 7, 9], 0.5));
  });
});

describe('worker probe', () => {
  test('arms an interval in a realm the drain has already touched', ({ expect }) => {
    const realm = makeRealm();

    // The order the flow actually produces: a realm born mid-stage is drained at that stage's
    // closing boundary before any probe reaches it.
    expect(evaluate(realm, WORKER_DRAIN_EXPRESSION)).toEqual([]);
    expect(evaluate(realm, WORKER_PROBE_EXPRESSION)).toBe('installed');
    expect(realm.intervals).toHaveLength(1);
  });

  test('does not arm a second interval', ({ expect }) => {
    const realm = makeRealm();

    expect(evaluate(realm, WORKER_PROBE_EXPRESSION)).toBe('installed');
    expect(evaluate(realm, WORKER_PROBE_EXPRESSION)).toBe('present');
    expect(realm.intervals).toHaveLength(1);
  });

  test('the drain returns the samples the interval recorded and clears them', ({ expect }) => {
    const realm = makeRealm();
    evaluate(realm, WORKER_PROBE_EXPRESSION);

    // One tick a second late, which is the blocked-loop case the metric exists to catch.
    realm.now += 1_000;
    realm.intervals[0]();

    expect(evaluate(realm, WORKER_DRAIN_EXPRESSION)).toEqual([984]);
    expect(evaluate(realm, WORKER_DRAIN_EXPRESSION)).toEqual([]);
  });
});

type Realm = { context: object; intervals: Array<() => void>; now: number };

/** A real realm for the probe expressions, so the shipped strings are what the test exercises. */
const makeRealm = (): Realm => {
  const realm: Realm = { context: {}, intervals: [], now: 0 };
  realm.context = createContext({
    performance: { now: () => realm.now },
    setInterval: (fn: () => void) => realm.intervals.push(fn),
  });
  return realm;
};

const evaluate = (realm: Realm, expression: string): any => runInContext(expression, realm.context);
