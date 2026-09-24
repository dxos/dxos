//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { GroupBy } from './group-by.ts';

describe('GroupBy.truncateTime', () => {
  const at = (iso: string) => Date.parse(iso);

  test('floors to the UTC hour or day, before 1970 too', () => {
    expect(GroupBy.truncateTime(at('2026-01-05T18:45:12Z'), 'hour')).toBe(at('2026-01-05T18:00:00Z'));
    expect(GroupBy.truncateTime(at('2026-01-05T18:45:00Z'), 'day')).toBe(at('2026-01-05T00:00:00Z'));
    expect(GroupBy.truncateTime(at('1969-12-31T23:00:00Z'), 'day')).toBe(at('1969-12-31T00:00:00Z'));
  });

  test('is null for anything but a finite number', () => {
    expect(GroupBy.truncateTime('2026-01-05', 'day')).toBeNull();
    expect(GroupBy.truncateTime(null, 'day')).toBeNull();
    expect(GroupBy.truncateTime(Number.NaN, 'hour')).toBeNull();
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
});
