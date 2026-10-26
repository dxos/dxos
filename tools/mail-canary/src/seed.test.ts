//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { parseAddress, pickPoolSlice } from './seed.ts';

const DAY = 24 * 60 * 60 * 1000;

describe('pickPoolSlice', () => {
  const pool = Array.from({ length: 250 }, (_, index) => `id-${String(index).padStart(3, '0')}`);

  test('consecutive days copy different mail', ({ expect }) => {
    const today = new Date(Date.UTC(2026, 9, 26, 6));
    const first = pickPoolSlice(pool, 100, today);
    const second = pickPoolSlice(pool, 100, new Date(today.getTime() + DAY));
    expect(first).toHaveLength(100);
    expect(first.filter((id) => second.includes(id))).toEqual([]);
  });

  test('wraps around the end of the pool and never repeats within a night', ({ expect }) => {
    const slice = pickPoolSlice(pool.slice(0, 30), 100, new Date(0));
    expect(slice).toHaveLength(30);
    expect(new Set(slice).size).toBe(30);
  });

  test('does not depend on the order Gmail lists the pool in', ({ expect }) => {
    const now = new Date(Date.UTC(2026, 0, 1));
    expect(pickPoolSlice([...pool].reverse(), 10, now)).toEqual(pickPoolSlice(pool, 10, now));
  });

  test('an empty pool gives nothing to seed', ({ expect }) => {
    expect(pickPoolSlice([], 100, new Date())).toEqual([]);
  });
});

describe('parseAddress', () => {
  test.for([
    ['Phillip Allen <phillip.allen@enron.com>', 'phillip.allen@enron.com'],
    ['<tim.belden@enron.com>', 'tim.belden@enron.com'],
    ['steven.kean@enron.com', 'steven.kean@enron.com'],
    ['"Kean, Steven" <steven.kean@enron.com>', 'steven.kean@enron.com'],
  ] as const)('%s', ([value, expected], { expect }) => {
    expect(parseAddress(value)).toBe(expected);
  });
});
