//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { formatDuration, parseDuration, parseRate } from './units.ts';

describe('units', () => {
  test('durations', ({ expect }) => {
    expect(parseDuration('2s')).toBe(2000);
    expect(parseDuration('200ms')).toBe(200);
    expect(parseDuration('1m20s')).toBe(80000);
    expect(parseDuration('1.5s')).toBe(1500);
    expect(parseDuration(3)).toBe(3000);
    expect(parseDuration('0s')).toBe(0);
    expect(parseDuration('')).toBeUndefined();
    expect(parseDuration('soon')).toBeUndefined();
    expect(parseDuration(-1)).toBeUndefined();
  });

  test('rates and formatting', ({ expect }) => {
    expect(parseRate('4/s')).toBe(4);
    expect(parseRate('30/m')).toBe(0.5);
    expect(parseRate(2)).toBe(2);
    expect(parseRate('0/s')).toBeUndefined();
    expect(parseRate('fast')).toBeUndefined();
    expect(formatDuration(180000)).toBe('3:00');
    expect(formatDuration(65000)).toBe('1:05');
  });
});
