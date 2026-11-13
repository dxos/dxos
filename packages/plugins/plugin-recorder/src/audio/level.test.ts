//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import {
  CLIP_DB,
  FLOOR_DB,
  PEAK_HOLD_MS,
  SILENCE_MS,
  initialMeterState,
  nextMeterState,
  toDb,
  toFraction,
} from './level.ts';

const block = (amplitude: number, length = 128) =>
  Array.from({ length }, (_, index) => (index % 2 ? amplitude : -amplitude));

describe('level', () => {
  test('dB scale', ({ expect }) => {
    expect(toDb(1)).toBe(0);
    expect(toDb(0.5)).toBeCloseTo(-6.02, 2);
    expect(toDb(0)).toBeLessThan(FLOOR_DB);
    expect(toFraction(FLOOR_DB)).toBe(0);
    expect(toFraction(0)).toBe(1);
    expect(toFraction(-30)).toBeCloseTo(0.5);
  });

  test('peak hold falls only after the hold time', ({ expect }) => {
    let state = nextMeterState(initialMeterState(0), block(0.5), 0);
    expect(state.holdDb).toBeCloseTo(-6.02, 2);
    state = nextMeterState(state, block(0.1), 100);
    expect(state.peakDb).toBeCloseTo(-20, 1);
    expect(state.holdDb).toBeCloseTo(-6.02, 2);
    state = nextMeterState(state, block(0.1), PEAK_HOLD_MS + 1);
    expect(state.holdDb).toBeCloseTo(-20, 1);
  });

  test('clip above the threshold', ({ expect }) => {
    const state = nextMeterState(initialMeterState(0), block(0.99), 0);
    expect(state.holdDb).toBeGreaterThan(CLIP_DB);
    expect(state.clip).toBe(true);
  });

  test('digital silence is flagged after the silence window', ({ expect }) => {
    let state = initialMeterState(0);
    state = nextMeterState(state, block(0), SILENCE_MS - 1);
    expect(state.silent).toBe(false);
    state = nextMeterState(state, block(0), SILENCE_MS + 1);
    expect(state.silent).toBe(true);
    state = nextMeterState(state, block(0.01), SILENCE_MS + 2);
    expect(state.silent).toBe(false);
  });
});
