//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test, vi } from 'vitest';

import {
  ABSOLUTE_CEILING,
  CREEP_TICK_MS,
  STATE_1_ASYMPTOTE,
  clampPercent,
  createLoaderStore,
  displayText,
  easeToward,
} from './store';

describe('easeToward', () => {
  test('eases toward the ceiling without overshooting', ({ expect }) => {
    const next = easeToward(0, 20, 0.04);
    expect(next).toBeCloseTo(0.8);
    expect(next).toBeLessThan(20);
  });

  test('holds when already at (or past) the ceiling', ({ expect }) => {
    expect(easeToward(20, 20, 0.04)).toBe(20);
    expect(easeToward(95, 90, 0.05)).toBe(95);
  });
});

describe('clampPercent', () => {
  test('maps a fraction to a percent', ({ expect }) => {
    expect(clampPercent(0.5)).toBe(50);
  });

  test('clamps out-of-range and invalid values to a safe percent', ({ expect }) => {
    expect(clampPercent(2)).toBe(100);
    expect(clampPercent(-1)).toBe(0);
    expect(clampPercent(Number.NaN)).toBe(0);
    expect(clampPercent(Number.POSITIVE_INFINITY)).toBe(0);
    expect(clampPercent(undefined)).toBe(0);
  });
});

describe('displayText', () => {
  test('passes humanized text through unchanged', ({ expect }) => {
    expect(displayText({ humanized: 'Loading framework…' })).toBe('Loading framework…');
  });

  test('appends an (index/total) suffix for range payloads', ({ expect }) => {
    expect(displayText({ humanized: 'Loading plugins', range: { index: 12, total: 80 } })).toBe(
      'Loading plugins (12/80)',
    );
  });
});

describe('createLoaderStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  test('seeds the initial status line', ({ expect }) => {
    const store = createLoaderStore('Loading…');
    expect(store.lines().map((line) => line.text)).toEqual(['Loading…']);
    store.dispose();
  });

  test('appends distinct status lines and dedups identical back-to-back updates', ({ expect }) => {
    const store = createLoaderStore();
    store.pushStatus({ humanized: 'A' });
    store.pushStatus({ humanized: 'A' });
    store.pushStatus({ humanized: 'B' });
    expect(store.lines().map((line) => line.text)).toEqual(['A', 'B']);
    store.dispose();
  });

  test('collapses range ticks into the current line in place', ({ expect }) => {
    const store = createLoaderStore();
    store.pushStatus({ humanized: 'Loading plugins', range: { index: 1, total: 80 } });
    store.pushStatus({ humanized: 'Loading plugins', range: { index: 40, total: 80 } });
    const lines = store.lines();
    expect(lines).toHaveLength(1);
    expect(lines[0].text).toBe('Loading plugins (40/80)');
    store.dispose();
  });

  test('progress never regresses and enters the host phase', ({ expect }) => {
    const store = createLoaderStore();
    store.setProgress(0.5);
    expect(store.phase()).toBe('host');
    expect(store.progress()).toBe(50);
    store.setProgress(0.2);
    expect(store.progress()).toBe(50);
    store.dispose();
  });

  test('ready snaps to 100% and enters the dismissing phase', ({ expect }) => {
    const store = createLoaderStore();
    store.setProgress(0.4);
    store.ready();
    expect(store.progress()).toBe(100);
    expect(store.phase()).toBe('dismissing');
    store.dispose();
  });

  test('auto-creep inches the ring toward the state-1 asymptote', ({ expect }) => {
    const store = createLoaderStore();
    expect(store.progress()).toBe(0);
    vi.advanceTimersByTime(CREEP_TICK_MS * 20);
    expect(store.progress()).toBeGreaterThan(0);
    expect(store.progress()).toBeLessThan(STATE_1_ASYMPTOTE);
    store.dispose();
  });

  test('disposed store stops creeping', ({ expect }) => {
    const store = createLoaderStore();
    vi.advanceTimersByTime(CREEP_TICK_MS * 5);
    const halted = store.progress();
    store.dispose();
    vi.advanceTimersByTime(CREEP_TICK_MS * 50);
    expect(store.progress()).toBe(halted);
  });

  test('auto-creep honours the absolute ceiling', ({ expect }) => {
    const store = createLoaderStore();
    // Host at 80% leads the creep ceiling to min(80 + 15, 90) = 90; the creep
    // must ease toward 90 and never cross it (the host owns the last 10%).
    store.setProgress(0.8);
    vi.advanceTimersByTime(CREEP_TICK_MS * 500);
    expect(store.progress()).toBeLessThanOrEqual(ABSOLUTE_CEILING + 0.1);
    store.dispose();
  });
});
