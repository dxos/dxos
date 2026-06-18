//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import {
  layoutDayEvents,
  minutesOfDay,
  minutesToY,
  setMinutesOfDay,
  snapMinutes,
  yToMinutes,
} from './util';

// 2026-06-16 is a Tuesday.
const day = new Date(2026, 5, 16);
const at = (hours: number, minutes = 0) => setMinutesOfDay(day, hours * 60 + minutes);

describe('time helpers', () => {
  test('minutesOfDay / setMinutesOfDay round-trip', ({ expect }) => {
    const date = at(9, 30);
    expect(minutesOfDay(date)).toEqual(9 * 60 + 30);
    expect(setMinutesOfDay(day, 9 * 60 + 30).getTime()).toEqual(date.getTime());
  });

  test('yToMinutes / minutesToY are inverses', ({ expect }) => {
    const hourHeight = 48;
    expect(yToMinutes(48, hourHeight)).toEqual(60);
    expect(minutesToY(60, hourHeight)).toEqual(48);
    expect(minutesToY(yToMinutes(123, hourHeight), hourHeight)).toBeCloseTo(123);
  });

  test('snapMinutes rounds to step and clamps to the day', ({ expect }) => {
    expect(snapMinutes(7)).toEqual(0);
    expect(snapMinutes(8)).toEqual(15);
    expect(snapMinutes(22, 15)).toEqual(15);
    expect(snapMinutes(23, 15)).toEqual(30);
    expect(snapMinutes(-10)).toEqual(0);
    expect(snapMinutes(24 * 60 + 100)).toEqual(24 * 60);
  });
});

describe('layoutDayEvents', () => {
  test('non-overlapping events each get the full width', ({ expect }) => {
    const events = [
      { start: at(9), end: at(10) },
      { start: at(11), end: at(12) },
    ];
    const layout = layoutDayEvents(events);
    expect(layout.get(0)).toEqual({ columnIndex: 0, columnCount: 1 });
    expect(layout.get(1)).toEqual({ columnIndex: 0, columnCount: 1 });
  });

  test('two overlapping events split into two columns', ({ expect }) => {
    const events = [
      { start: at(9), end: at(11) },
      { start: at(10), end: at(12) },
    ];
    const layout = layoutDayEvents(events);
    expect(layout.get(0)).toEqual({ columnIndex: 0, columnCount: 2 });
    expect(layout.get(1)).toEqual({ columnIndex: 1, columnCount: 2 });
  });

  test('result is independent of input order', ({ expect }) => {
    const events = [
      { start: at(10), end: at(12) },
      { start: at(9), end: at(11) },
    ];
    const layout = layoutDayEvents(events);
    expect(layout.get(1)).toEqual({ columnIndex: 0, columnCount: 2 });
    expect(layout.get(0)).toEqual({ columnIndex: 1, columnCount: 2 });
  });

  test('a freed column is reused within the same cluster', ({ expect }) => {
    // C overlaps B (which holds the cluster open) but starts after A ends, so it reuses A's column.
    const events = [
      { start: at(9), end: at(10) }, // A
      { start: at(9, 30), end: at(12) }, // B
      { start: at(10, 30), end: at(11) }, // C
    ];
    const layout = layoutDayEvents(events);
    expect(layout.get(0)).toEqual({ columnIndex: 0, columnCount: 2 });
    expect(layout.get(1)).toEqual({ columnIndex: 1, columnCount: 2 });
    expect(layout.get(2)).toEqual({ columnIndex: 0, columnCount: 2 });
  });

  test('adjacent (touching) events do not overlap', ({ expect }) => {
    const events = [
      { start: at(9), end: at(10) },
      { start: at(10), end: at(11) },
    ];
    const layout = layoutDayEvents(events);
    expect(layout.get(0)).toEqual({ columnIndex: 0, columnCount: 1 });
    expect(layout.get(1)).toEqual({ columnIndex: 0, columnCount: 1 });
  });
});
