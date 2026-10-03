//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { toActivity } from './activity.ts';

describe('toActivity', () => {
  test('rolls hours into local days and drops unknown hours', ({ expect }) => {
    const at = (day: number, hour: number) => new Date(2026, 0, day, hour).getTime();
    const rows = [
      { hour: at(6, 9), count: 5 },
      { hour: at(5, 1), count: 3 },
      { hour: null, count: 4 },
      { hour: at(5, 23), count: 2 },
    ];

    expect(toActivity(rows)).toEqual([
      { date: new Date(2026, 0, 5), value: 5 },
      { date: new Date(2026, 0, 6), value: 5 },
    ]);
  });
});
