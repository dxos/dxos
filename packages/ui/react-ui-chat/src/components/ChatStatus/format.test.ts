//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { formatElapsed } from './format';

describe('formatElapsed', () => {
  test('zero returns 0s', ({ expect }) => {
    expect(formatElapsed(0)).toBe('0s');
  });

  test('negative inputs clamp to 0s', ({ expect }) => {
    expect(formatElapsed(-1_000)).toBe('0s');
    expect(formatElapsed(-Infinity)).toBe('0s');
  });

  test('seconds tier under one minute', ({ expect }) => {
    expect(formatElapsed(999)).toBe('0s');
    expect(formatElapsed(1_000)).toBe('1s');
    expect(formatElapsed(12_400)).toBe('12s');
    expect(formatElapsed(59_999)).toBe('59s');
  });

  test('boundary at one minute', ({ expect }) => {
    expect(formatElapsed(60_000)).toBe('1m 0s');
    expect(formatElapsed(60_999)).toBe('1m 0s');
    expect(formatElapsed(61_000)).toBe('1m 1s');
  });

  test('minutes tier under one hour', ({ expect }) => {
    expect(formatElapsed(92_000)).toBe('1m 32s');
    expect(formatElapsed(3_540_000)).toBe('59m 0s');
    expect(formatElapsed(3_599_999)).toBe('59m 59s');
  });

  test('boundary at one hour', ({ expect }) => {
    expect(formatElapsed(3_600_000)).toBe('1h 0m');
    expect(formatElapsed(3_660_000)).toBe('1h 1m');
  });

  test('hours tier drops smaller units', ({ expect }) => {
    expect(formatElapsed(3_720_000)).toBe('1h 2m');
    expect(formatElapsed(7_323_000)).toBe('2h 2m');
    expect(formatElapsed(36_000_000)).toBe('10h 0m');
  });
});
