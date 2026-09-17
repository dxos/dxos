//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { toActivity } from './activity.ts';

const hourOf = (date: Date): number => Math.floor(date.getTime() / 3_600_000) * 3_600_000;

describe('toActivity', () => {
  test('sums hours into local days and drops unknown hours', ({ expect }) => {
    const rows = [
      { hour: hourOf(new Date(2026, 0, 5, 9)), count: 2 },
      { hour: hourOf(new Date(2026, 0, 5, 17)), count: 1 },
      { hour: null, count: 4 },
      { hour: hourOf(new Date(2026, 0, 6, 1)), count: 5 },
    ];

    expect(toActivity(rows)).toEqual([
      { date: new Date(2026, 0, 5), value: 3 },
      { date: new Date(2026, 0, 6), value: 5 },
    ]);
  });
});
