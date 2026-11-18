//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { orderKeys } from './order-keys.ts';

describe('orderKeys', () => {
  test('orders keys as specified', ({ expect }) => {
    const result = orderKeys({ a: 1, b: 2, c: 3 }, ['c', 'a', 'b']);
    expect(Object.keys(result)).toEqual(['c', 'a', 'b']);
    expect(result).toEqual({ a: 1, b: 2, c: 3 });
  });

  test('keys missing from the order follow in original order', ({ expect }) => {
    const result = orderKeys({ a: 1, b: 2, c: 3, d: 4 }, ['c']);
    expect(Object.keys(result)).toEqual(['c', 'a', 'b', 'd']);
  });

  test('order entries absent from the object are skipped', ({ expect }) => {
    const result = orderKeys<{ a: number; b?: number }>({ a: 1 }, ['b', 'a']);
    expect(Object.keys(result)).toEqual(['a']);
  });

  test('empty order keeps the original order', ({ expect }) => {
    expect(Object.keys(orderKeys({ b: 1, a: 2 }, []))).toEqual(['b', 'a']);
  });

  test('empty object', ({ expect }) => {
    expect(orderKeys({}, [])).toEqual({});
  });

  test('returns a new object', ({ expect }) => {
    const obj = { a: 1, b: 2 };
    const result = orderKeys(obj, ['b', 'a']);
    expect(result).not.toBe(obj);
    expect(Object.keys(obj)).toEqual(['a', 'b']);
  });
});
