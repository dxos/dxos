//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { toActivity } from './activity.ts';

describe('toActivity', () => {
  test('merges rows for the same day and drops unknown days', ({ expect }) => {
    const monday = new Date(2026, 0, 5).getTime();
    const tuesday = new Date(2026, 0, 6).getTime();
    const rows = [
      { day: monday, count: 2 },
      { day: tuesday, count: 5 },
      { day: monday, count: 1 },
      { day: null, count: 4 },
    ];

    expect(toActivity(rows)).toEqual([
      { date: new Date(2026, 0, 5), value: 3 },
      { date: new Date(2026, 0, 6), value: 5 },
    ]);
  });
});
