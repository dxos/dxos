//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { GroupBy } from './group-by.ts';

describe('GroupBy.truncateTimestamp', () => {
  const at = (iso: string) => Date.parse(iso);

  test('an hour starts on the UTC hour', () => {
    expect(GroupBy.truncateTimestamp(at('2026-01-05T18:45:12Z'), 'hour')).toBe(at('2026-01-05T18:00:00Z'));
  });

  test('a day starts at local midnight, including half-hour zones and daylight-saving days', () => {
    // 00:15 on 6 January in India (+05:30).
    expect(GroupBy.truncateTimestamp(at('2026-01-05T18:45:00Z'), 'day', 'Asia/Kolkata')).toBe(
      at('2026-01-05T18:30:00Z'),
    );
    // 13:00 PDT on 8 March, the day clocks go forward; that day began at midnight PST (-08:00).
    expect(GroupBy.truncateTimestamp(at('2026-03-08T20:00:00Z'), 'day', 'America/Los_Angeles')).toBe(
      at('2026-03-08T08:00:00Z'),
    );
    // Santiago's clocks go forward at midnight on 6 September, so that day starts at 01:00 local.
    expect(GroupBy.truncateTimestamp(at('2026-09-06T12:00:00Z'), 'day', 'America/Santiago')).toBe(
      at('2026-09-06T04:00:00Z'),
    );
    expect(GroupBy.truncateTimestamp(at('2026-01-05T18:45:00Z'), 'day')).toBe(at('2026-01-05T00:00:00Z'));
  });
});

describe('GroupBy aggregates', () => {
  test('sum adds finite numbers and counts anything else as 0', () => {
    expect(GroupBy.sum([1, 2.5, null, undefined, 'x', Number.NaN, Number.POSITIVE_INFINITY])).toBe(3.5);
    expect(GroupBy.sum([])).toBe(0);
  });

  test('a weighted member counts as the changes it stands for', () => {
    expect(GroupBy.countMembers([{ weight: 3 }, {}, { weight: 2 }])).toBe(6);
  });

  test('a time key truncates a numeric property and is null for anything else', () => {
    const at = Date.parse('2026-01-05T18:45:12Z');
    expect(GroupBy.truncateTimeProperty(at, 'hour')).toBe(Date.parse('2026-01-05T18:00:00Z'));
    expect(GroupBy.truncateTimeProperty('2026-01-05', 'day')).toBeNull();
    expect(GroupBy.truncateTimeProperty(undefined, 'day')).toBeNull();
  });
});
