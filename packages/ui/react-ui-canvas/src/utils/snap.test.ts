//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { detentOf, magnetTo, nearestStop, snapTo } from './snap.ts';

describe('snap', () => {
  test('detentOf holds a value on its snapped place within the detent and leaves it otherwise', ({ expect }) => {
    expect(detentOf(1.9, 2, 0.2)).toBe(2);
    expect(detentOf(1.7, 2, 0.2)).toBe(1.7);
  });

  test('snapTo lands on the nearest whole step; a zero step leaves the value', ({ expect }) => {
    expect(snapTo(1.3, 0.5)).toBe(1.5);
    expect(snapTo(-0.8, 1)).toBe(-1);
    expect(snapTo(1.3, 0)).toBe(1.3);
  });

  test('magnetTo follows the value but holds it on a step it passes within the detent', ({ expect }) => {
    expect(magnetTo(1.95, 1, 0.1)).toBe(2);
    expect(magnetTo(1.6, 1, 0.1)).toBe(1.6);
    expect(magnetTo(1.6, 0, 0.1)).toBe(1.6);
  });

  test('magnetTo holds within a quarter of a step at most, so a fine grid is not all detent', ({ expect }) => {
    expect(magnetTo(0.375, 0.25, 0.2)).toBe(0.375);
    expect(magnetTo(0.32, 0.25, 0.2)).toBe(0.32);
    expect(magnetTo(0.3, 0.25, 0.2)).toBe(0.25);
  });

  test('nearestStop is the stop closest to a value within the detent; none when every stop is farther', ({
    expect,
  }) => {
    const stops = [
      { delta: 1, id: 'a' },
      { delta: 1.3, id: 'b' },
      { delta: -2, id: 'c' },
    ];
    expect(nearestStop(1.2, stops, 0.15)?.id).toBe('b');
    expect(nearestStop(-1.9, stops, 0.15)?.id).toBe('c');
    expect(nearestStop(0.5, stops, 0.15)).toBeUndefined();
  });
});
