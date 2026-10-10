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

  test('an echo confirms every earlier report', ({ expect }) => {
    const filter = new EchoFilter<number[]>();
    filter.reported([1]);
    filter.reported([1, 2]);
    expect(filter.isEcho([1, 2])).toBe(true);
    // The older report was superseded; seeing it now means someone else wrote it.
    expect(filter.isEcho([1])).toBe(false);
  });
});
