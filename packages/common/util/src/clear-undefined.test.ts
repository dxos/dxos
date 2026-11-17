//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { clearUndefined } from './clear-undefined.ts';

describe('clearUndefined', () => {
  test('removes undefined properties', ({ expect }) => {
    const result = clearUndefined({ a: 1, b: undefined, c: 'x' });
    expect(Object.keys(result)).toEqual(['a', 'c']);
    expect('b' in result).toBe(false);
  });

  test('keeps null, false, 0 and empty string', ({ expect }) => {
    const value = { a: null, b: false, c: 0, d: '' };
    expect(clearUndefined({ ...value })).toEqual(value);
  });

  test('empty object is unchanged', ({ expect }) => {
    expect(clearUndefined({})).toEqual({});
  });

  test('mutates and returns the same object', ({ expect }) => {
    const obj = { a: undefined, b: 1 };
    expect(clearUndefined(obj)).toBe(obj);
    expect('a' in obj).toBe(false);
  });

  test('is shallow: nested undefined is preserved', ({ expect }) => {
    const result = clearUndefined({ nested: { a: undefined as number | undefined }, b: undefined });
    expect('b' in result).toBe(false);
    expect('a' in result.nested).toBe(true);
  });

  test('removes undefined symbol-keyed properties', ({ expect }) => {
    const removed = Symbol('removed');
    const kept = Symbol('kept');
    const result = clearUndefined({ [removed]: undefined, [kept]: 1 });
    expect(removed in result).toBe(false);
    expect(kept in result).toBe(true);
  });
});
