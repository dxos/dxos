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

  test('a day starts at UTC midnight, before 1970 too', () => {
    expect(GroupBy.truncateTimestamp(at('2026-01-05T18:45:00Z'), 'day')).toBe(at('2026-01-05T00:00:00Z'));
    expect(GroupBy.truncateTimestamp(at('1969-12-31T23:00:00Z'), 'day')).toBe(at('1969-12-31T00:00:00Z'));
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
