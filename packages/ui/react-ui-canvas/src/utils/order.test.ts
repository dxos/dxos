//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { between, initialKeys, orderToEnd, sortByZ, topZ } from './order.ts';

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

  describe('orderToEnd', () => {
    const group = (keys: readonly string[]) => keys.map((z, index) => ({ id: `n${index}`, z }));
    const after = (elements: readonly { id: string; z?: string }[], keys: Record<string, string>) =>
      sortByZ(elements.map(({ id, z }) => ({ id, z: keys[id] ?? z ?? '' }))).map(({ id }) => id);

    test('lifts the selection above the rest, in its own order', ({ expect }) => {
      const elements = group(['1', '2', '3', '4']);
      const keys = orderToEnd(elements, ['n0', 'n1'], 'front');
      expect(after(elements, keys)).toEqual(['n2', 'n3', 'n0', 'n1']);
    });

    test('drops the selection below the rest, in its own order', ({ expect }) => {
      const elements = group(['1', '2', '3', '4']);
      const keys = orderToEnd(elements, ['n2', 'n3'], 'back');
      expect(after(elements, keys)).toEqual(['n2', 'n3', 'n0', 'n1']);
    });

    test('keys only what moves', ({ expect }) => {
      const elements = group(['1', '2', '3']);
      expect(Object.keys(orderToEnd(elements, ['n0'], 'front'))).toEqual(['n0']);
      expect(Object.keys(orderToEnd(elements, ['n2'], 'back'))).toEqual(['n2']);
    });

    test('nothing to do when the selection is already at that end', ({ expect }) => {
      const elements = group(['1', '2', '3']);
      expect(orderToEnd(elements, ['n1', 'n2'], 'front')).toEqual({});
      expect(orderToEnd(elements, ['n0'], 'back')).toEqual({});
      expect(orderToEnd(elements, ['n0', 'n1', 'n2'], 'front')).toEqual({});
      expect(orderToEnd(elements, [], 'front')).toEqual({});
    });

    test('renumbers the group when an element has no key to go under', ({ expect }) => {
      const elements = [{ id: 'a' }, { id: 'b', z: '2' }, { id: 'c', z: '3' }];
      const keys = orderToEnd(elements, ['c'], 'back');
      expect(Object.keys(keys).sort()).toEqual(['a', 'b', 'c']);
      expect(after(elements, keys)).toEqual(['c', 'a', 'b']);
    });

    test('lifts above a group written with no keys', ({ expect }) => {
      const elements = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
      const keys = orderToEnd(elements, ['a'], 'front');
      expect(after(elements, keys)).toEqual(['b', 'c', 'a']);
    });
  });

  test('a stored key no key fits past renumbers the group, keeping the order it settles in', ({ expect }) => {
    // 'a0' has a trailing zero, so nothing can be keyed under it; the whole group is renumbered instead.
    const elements = [
      { id: 'back', z: 'a0' },
      { id: 'a', z: 'a1' },
      { id: 'b', z: 'a2' },
    ];
    const keys = orderToEnd(elements, ['a'], 'back');
    expect(Object.keys(keys).sort()).toEqual(['a', 'b', 'back']);
    expect(sortByZ(elements.map(({ id }) => ({ id, z: keys[id] }))).map(({ id }) => id)).toEqual(['a', 'back', 'b']);
  });

  test('a key with a trailing zero at the top renumbers rather than throwing', ({ expect }) => {
    const elements = [
      { id: 'a', z: 'a1' },
      { id: 'top', z: 'b0' },
    ];
    const keys = orderToEnd(elements, ['a'], 'front');
    expect(sortByZ(elements.map(({ id }) => ({ id, z: keys[id] ?? '' }))).map(({ id }) => id)).toEqual(['top', 'a']);
  });
});
