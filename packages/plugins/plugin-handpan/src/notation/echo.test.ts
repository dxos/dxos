//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { EchoFilter } from './echo.ts';

describe('EchoFilter', () => {
  test('a delayed echo of an older report is not taken as an external update', ({ expect }) => {
    const filter = new EchoFilter<number[]>();
    filter.reported([1]);
    filter.reported([1, 2]);
    expect(filter.isEcho([1])).toBe(true);
    expect(filter.isEcho([1, 2])).toBe(true);
  });

  test('a value never reported is an external update', ({ expect }) => {
    const filter = new EchoFilter<number[]>();
    filter.reported([1]);
    expect(filter.isEcho([9])).toBe(false);
  });

  test('echoes delivered out of order are all recognized', ({ expect }) => {
    const filter = new EchoFilter<number[]>();
    filter.reported([1]);
    filter.reported([1, 2]);
    expect(filter.isEcho([1, 2])).toBe(true);
    // The older report arriving after the newer one is still this side's stale echo, not an external write.
    expect(filter.isEcho([1])).toBe(true);
  });
});
