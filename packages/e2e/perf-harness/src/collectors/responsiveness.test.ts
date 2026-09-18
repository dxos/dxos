//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { percentile } from './responsiveness.ts';

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
