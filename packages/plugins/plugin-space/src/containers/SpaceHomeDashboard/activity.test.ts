//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { toActivity } from './activity.ts';

describe('toActivity', () => {
  test('gives each day one calendar entry and drops unknown days', ({ expect }) => {
    const rows = [
      { day: new Date(2026, 0, 5).getTime(), count: 3 },
      { day: null, count: 4 },
      { day: new Date(2026, 0, 6).getTime(), count: 5 },
    ];

    expect(toActivity(rows)).toEqual([
      { date: new Date(2026, 0, 5), value: 3 },
      { date: new Date(2026, 0, 6), value: 5 },
    ]);
  });
});
