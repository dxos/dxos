//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { buildCalendar, normalizeDate, toKey } from './util';

describe('buildCalendar', () => {
  test('lays out Monday-first weeks ending on the end date', ({ expect }) => {
    // 2026-06-30 is a Tuesday (row 1 of a Monday-first week).
    const calendar = buildCalendar({ data: [], weeks: 4, endDate: '2026-06-30' });
    expect(calendar.weeks).toBe(4);
    expect(calendar.cells).toHaveLength(3 * 7 + 2);

    const first = calendar.cells[0];
    expect(first.week).toBe(0);
    expect(first.day).toBe(0);
    expect(first.date.getDay()).toBe(1);

    const last = calendar.cells.at(-1)!;
    expect(last.key).toBe('2026-06-30');
    expect(last.week).toBe(3);
    expect(last.day).toBe(1);
  });

  test('aggregates values by day and buckets levels', ({ expect }) => {
    const calendar = buildCalendar({
      data: [
        { date: '2026-06-29', value: 2 },
        { date: '2026-06-29', value: 6 },
        { date: '2026-06-30', value: 2 },
        { date: '2026-06-28', value: 5 },
      ],
      weeks: 2,
      endDate: '2026-06-30',
    });

    expect(calendar.max).toBe(8);
    const byKey = Object.fromEntries(calendar.cells.map((cell) => [cell.key, cell]));
    expect(byKey['2026-06-29']).toMatchObject({ value: 8, level: 4 });
    expect(byKey['2026-06-30']).toMatchObject({ value: 2, level: 1 });
    expect(byKey['2026-06-28']).toMatchObject({ value: 5, level: 3 });
    expect(byKey['2026-06-27']).toMatchObject({ value: 0, level: 0 });
  });

  test('defaults the end date to the most recent datum', ({ expect }) => {
    const calendar = buildCalendar({ data: [{ date: '2026-05-15', value: 1 }], weeks: 1 });
    expect(calendar.cells.at(-1)!.key).toBe('2026-05-15');
  });

  test('marks month boundaries at week starts and drops crowded labels', ({ expect }) => {
    // 2026-07-11 is a Saturday, so the calendar spans Monday 2026-06-22 through 2026-07-11;
    // the June label at week 0 is dropped because July starts two columns later.
    const narrow = buildCalendar({ data: [], weeks: 3, endDate: '2026-07-11' });
    expect(narrow.months).toEqual([{ weekIndex: 2, month: 6, year: 2026 }]);

    const year = buildCalendar({ data: [], weeks: 52, endDate: '2026-06-30' });
    expect(year.months.length).toBeGreaterThanOrEqual(11);
    const gaps = year.months.slice(1).map((entry, index) => entry.weekIndex - year.months[index].weekIndex);
    expect(gaps.every((gap) => gap >= 3)).toBe(true);
  });

  test('levels are zero when there is no data', ({ expect }) => {
    const calendar = buildCalendar({ data: [], weeks: 2, endDate: '2026-06-30' });
    expect(calendar.max).toBe(0);
    expect(calendar.cells.every((cell) => cell.level === 0)).toBe(true);
  });
});

describe('normalizeDate', () => {
  test('parses ISO strings in the local timezone', ({ expect }) => {
    const date = normalizeDate('2026-01-02');
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(0);
    expect(date.getDate()).toBe(2);
    expect(toKey(date)).toBe('2026-01-02');
  });

  test('strips the time component from dates', ({ expect }) => {
    const date = normalizeDate(new Date(2026, 5, 30, 23, 59));
    expect(date.getHours()).toBe(0);
    expect(toKey(date)).toBe('2026-06-30');
  });
});
