//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type DataReading, diffData } from './data.ts';

describe('diffData', () => {
  test('differences each realm against its own opening reading and sums across realms', ({ expect }) => {
    const before: DataReading[] = [
      { name: 'page', counters: { 'echo.queryRecomputes': 10 } },
      { name: 'worker:dedicated.js', counters: { 'automerge.incrementalSaves': 4, 'sqlite.selects': 100 } },
    ];
    const after: DataReading[] = [
      { name: 'page', counters: { 'echo.queryRecomputes': 15 } },
      { name: 'worker:dedicated.js', counters: { 'automerge.incrementalSaves': 6, 'sqlite.selects': 100 } },
      // Appeared mid-stage: everything it counted is the stage's.
      { name: 'worker:other.js', counters: { 'echo.queryRecomputes': 2 } },
    ];
    expect(diffData(before, after)).toEqual({
      counters: { 'echo.queryRecomputes': 7, 'automerge.incrementalSaves': 2 },
      realms: 3,
    });
  });
});
