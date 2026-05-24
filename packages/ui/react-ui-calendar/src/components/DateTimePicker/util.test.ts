//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { coerceValue, defaultValueFor, normalizeRange, withDate, withTime } from './util';

describe('coerceValue', () => {
  test('date mode zeroes time component', ({ expect }) => {
    const v = coerceValue('date', new Date(2026, 4, 24, 14, 30, 0)); // May 24 14:30 local
    expect((v as Date).getHours()).toBe(0);
    expect((v as Date).getMinutes()).toBe(0);
    expect((v as Date).getSeconds()).toBe(0);
    expect((v as Date).getMilliseconds()).toBe(0);
  });

  test('date-time mode preserves time component', ({ expect }) => {
    const v = coerceValue('date-time', new Date(2026, 4, 24, 14, 30, 0)); // May 24 14:30 local
    expect((v as Date).getHours()).toBe(14);
    expect((v as Date).getMinutes()).toBe(30);
  });

  test('date-range mode zeroes time on both endpoints and normalizes order', ({ expect }) => {
    const v = coerceValue('date-range', {
      from: new Date(2026, 4, 24, 14, 30, 0), // May 24 14:30 local
      to: new Date(2026, 4, 20, 9, 0, 0), // May 20 09:00 local
    });
    expect((v as { from: Date; to: Date }).from.getTime()).toBeLessThan((v as { from: Date; to: Date }).to.getTime());
    expect((v as { from: Date; to: Date }).from.getHours()).toBe(0);
    expect((v as { from: Date; to: Date }).to.getHours()).toBe(0);
  });
});

describe('normalizeRange', () => {
  test('swaps from/to when out of order', ({ expect }) => {
    const earlier = new Date(2026, 4, 20); // May 20 local time
    const later = new Date(2026, 4, 24); // May 24 local time
    const r = normalizeRange({ from: later, to: earlier });
    expect(r.from.getDate()).toBe(20);
    expect(r.to.getDate()).toBe(24);
  });

  test('leaves ordered range unchanged', ({ expect }) => {
    const earlier = new Date(2026, 4, 20); // May 20 local time
    const later = new Date(2026, 4, 24); // May 24 local time
    const r = normalizeRange({ from: earlier, to: later });
    expect(r.from.getDate()).toBe(20);
    expect(r.to.getDate()).toBe(24);
  });
});

describe('withDate / withTime', () => {
  test('withDate replaces year/month/day, preserves hours/minutes', ({ expect }) => {
    const target = new Date(2026, 4, 24, 14, 30, 0); // May 24 14:30 local
    const source = new Date(2026, 7, 15, 0, 0, 0); // Aug 15 00:00 local
    const result = withDate(target, source);
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(7);
    expect(result.getDate()).toBe(15);
    expect(result.getHours()).toBe(14);
    expect(result.getMinutes()).toBe(30);
  });

  test('withTime replaces hours/minutes, preserves date', ({ expect }) => {
    const target = new Date(2026, 4, 24, 14, 30, 0); // May 24 14:30 local
    const result = withTime(target, 9, 0);
    expect(result.getFullYear()).toBe(2026);
    expect(result.getDate()).toBe(24);
    expect(result.getHours()).toBe(9);
    expect(result.getMinutes()).toBe(0);
  });
});

describe('defaultValueFor', () => {
  test('date mode returns a midnight Date', ({ expect }) => {
    const v = defaultValueFor('date') as Date;
    expect(v.getHours()).toBe(0);
    expect(v.getMinutes()).toBe(0);
  });

  test('date-range mode returns a same-day from/to', ({ expect }) => {
    const v = defaultValueFor('date-range') as { from: Date; to: Date };
    expect(v.from.getFullYear()).toBe(v.to.getFullYear());
    expect(v.from.getMonth()).toBe(v.to.getMonth());
    expect(v.from.getDate()).toBe(v.to.getDate());
  });
});
