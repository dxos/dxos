//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { compactInterval, formatCompact } from './format-time.ts';

const now = new Date('2026-09-24T12:00:00Z');
const daysBefore = (days: number): string => new Date(now.getTime() - days * 24 * 60 * 60_000).toISOString();
const minutesBefore = (minutes: number): string => new Date(now.getTime() - minutes * 60_000).toISOString();

describe('formatCompact', () => {
  test('the first minute is not a count', ({ expect }) => {
    expect(formatCompact(minutesBefore(0), { now })).to.eq('now');
    expect(formatCompact(minutesBefore(0.5), { now })).to.eq('now');
  });

  test('minutes run past the hour, where a reader still feels them', ({ expect }) => {
    expect(formatCompact(minutesBefore(1), { now })).to.eq('1m');
    expect(formatCompact(minutesBefore(90), { now })).to.eq('90m');
    expect(formatCompact(minutesBefore(119), { now })).to.eq('119m');
  });

  test('then hours, to the day', ({ expect }) => {
    expect(formatCompact(minutesBefore(120), { now })).to.eq('2h');
    expect(formatCompact(minutesBefore(23 * 60), { now })).to.eq('23h');
  });

  test('beyond a day it is a date, and the year only when it is another one', ({ expect }) => {
    const sameYear = formatCompact(daysBefore(2), { now });
    expect(sameYear).to.not.contain('h');
    expect(sameYear).to.not.contain(String(now.getFullYear()));
    expect(formatCompact(daysBefore(400), { now })).to.contain('2025');
  });

  test('an unparseable value leaves the cell empty rather than explaining itself', ({ expect }) => {
    expect(formatCompact('not a date', { now })).to.eq('');
  });
});

describe('compactInterval', () => {
  test('a minute counter wakes on the minute it is about to miss', ({ expect }) => {
    expect(compactInterval(new Date(now.getTime() - 90_000), { now })).to.eq(30_000);
  });

  test('an hour counter wakes on the hour', ({ expect }) => {
    const elapsed = 5 * 3_600_000 + 600_000;
    expect(compactInterval(new Date(now.getTime() - elapsed), { now })).to.eq(3_600_000 - 600_000);
  });

  test('an hour counter keeps ticking up to the day it becomes a date', ({ expect }) => {
    // 23h59m: the last minute of the hour form, which must still be scheduled or the label freezes
    // one hour short of the date it should become.
    const elapsed = 23 * 3_600_000 + 59 * 60_000;
    expect(compactInterval(new Date(now.getTime() - elapsed), { now })).to.eq(3_600_000 - 59 * 60_000);
  });

  test('a future instant wakes when the clock catches up', ({ expect }) => {
    expect(compactInterval(new Date(now.getTime() + 5 * 60_000), { now })).to.eq(5 * 60_000);
    // Beyond the timer's range the wait is capped rather than requested, since `setTimeout` would
    // otherwise fire at once and spin.
    expect(compactInterval(new Date(now.getTime() + 400 * 24 * 3_600_000), { now })).to.eq(2_147_483_647);
  });

  test('a date never changes again on any timer this component owns', ({ expect }) => {
    expect(compactInterval(daysBefore(30), { now })).to.eq(undefined);
    expect(compactInterval('not a date', { now })).to.eq(undefined);
  });
});
