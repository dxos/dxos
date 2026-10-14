//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { between, initialKeys, sortByZ, topZ } from './order.ts';

describe('order', () => {
  test('between yields keys strictly inside the interval', ({ expect }) => {
    const first = between();
    const above = between(first);
    const below = between(undefined, first);
    const middle = between(below, above);
    expect(below < first && first < above).toBe(true);
    expect(below < middle && middle < above).toBe(true);
  });

  test('repeatedly inserting between two neighbours stays ordered', ({ expect }) => {
    let low = between();
    const high = between(low);
    const keys = [low, high];
    for (let index = 0; index < 50; index++) {
      low = between(low, high);
      keys.push(low);
    }
    const sorted = [...keys].sort();
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.filter((key) => key !== high).every((key) => key < high)).toBe(true);
    expect(sorted[sorted.length - 1]).toBe(high);
  });

  test('initialKeys are ascending and topZ is above them all', ({ expect }) => {
    const keys = initialKeys(5);
    expect([...keys].sort()).toEqual(keys);
    const elements = keys.map((z, index) => ({ id: `c${index}`, z }));
    const top = topZ(elements);
    expect(elements.every((element) => element.z < top)).toBe(true);
    expect(sortByZ([elements[3], elements[0], elements[4]]).map(({ id }) => id)).toEqual(['c0', 'c3', 'c4']);
  });

  test('rejects inverted or zero-terminated keys', ({ expect }) => {
    expect(() => between('b', 'a')).toThrow();
    expect(() => between('a0')).toThrow();
  });
});
