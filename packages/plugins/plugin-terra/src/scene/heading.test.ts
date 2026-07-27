//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { MAX_TURN_RATE_DEG_PER_SEC, easeHeading } from './heading';

describe('easeHeading', () => {
  test('a first frame (no previous heading) snaps straight to target, no spin-up', () => {
    expect(easeHeading(undefined, 123, 16, 'boat')).toBe(123);
  });

  test('turns toward target by at most the max rate scaled by elapsed time', () => {
    const deltaMs = 100; // A tenth of a second, well short of covering the full 90-degree turn.
    const result = easeHeading(0, 90, deltaMs, 'boat');
    expect(result).toBeCloseTo(MAX_TURN_RATE_DEG_PER_SEC.boat * (deltaMs / 1000), 9);
  });

  test('each kind turns at its own max rate', () => {
    const deltaMs = 100;
    const boat = easeHeading(0, 90, deltaMs, 'boat');
    const satellite = easeHeading(0, 90, deltaMs, 'satellite');
    expect(satellite).toBeGreaterThan(boat);
    expect(boat).toBeCloseTo(MAX_TURN_RATE_DEG_PER_SEC.boat * (deltaMs / 1000), 9);
    expect(satellite).toBeCloseTo(MAX_TURN_RATE_DEG_PER_SEC.satellite * (deltaMs / 1000), 9);
  });

  test('reaches the target exactly once close enough, without overshooting', () => {
    const result = easeHeading(88, 90, 500, 'boat');
    expect(result).toBeCloseTo(90, 9);
  });

  test('takes the shorter way around the 0/360 wrap', () => {
    const result = easeHeading(350, 10, 500, 'boat');
    expect(result).toBeCloseTo(10, 9);
  });

  test('a zero-length frame does not move the heading', () => {
    expect(easeHeading(45, 200, 0, 'boat')).toBeCloseTo(45, 9);
  });

  test('a negative delta (clock jitter) is treated as zero elapsed rather than turning backwards', () => {
    expect(easeHeading(45, 200, -16, 'boat')).toBeCloseTo(45, 9);
  });
});
