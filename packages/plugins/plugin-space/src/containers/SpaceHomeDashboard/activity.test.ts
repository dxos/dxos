//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { toActivity } from './activity.ts';

describe('toActivity', () => {
  test('sums hours into local days', ({ expect }) => {
    const rows = [
      { hour: hourOf(new Date(2026, 0, 5, 9)), changes: 2 },
      { hour: hourOf(new Date(2026, 0, 5, 17)), changes: 1 },
      { hour: hourOf(new Date(2026, 0, 6, 1)), changes: 5 },
    ];

    expect(toActivity(rows)).toEqual([
      { date: new Date(2026, 0, 5), value: 3 },
      { date: new Date(2026, 0, 6), value: 5 },
    ]);
  });
});

const hourOf = (date: Date): number => Math.floor(date.getTime() / 3_600_000);
