//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { shallowEqual } from './equals.ts';

describe('shallowEqual', () => {
  test('same reference', ({ expect }) => {
    const value = { a: 1 };
    expect(shallowEqual(value, value)).toBe(true);
  });

  test('same own keys with identical values', ({ expect }) => {
    expect(shallowEqual({ a: 1, b: 'x' }, { a: 1, b: 'x' })).toBe(true);
  });

  test('distinct objects with the same top-level entries', ({ expect }) => {
    const subject = { id: 'x' };
    expect(shallowEqual({ subject }, { subject })).toBe(true);
  });

  test('differing values', ({ expect }) => {
    expect(shallowEqual({ a: 1 }, { a: 2 })).toBe(false);
  });

  test('differing key counts', ({ expect }) => {
    expect(shallowEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
  });

  test('nested objects are compared by identity', ({ expect }) => {
    expect(shallowEqual({ a: { b: 1 } }, { a: { b: 1 } })).toBe(false);
  });

  test('an array is never equal to a record', ({ expect }) => {
    expect(shallowEqual([], {})).toBe(false);
    expect(shallowEqual({}, [])).toBe(false);
  });

  test('sparse arrays of differing length', ({ expect }) => {
    expect(shallowEqual(new Array(1), [])).toBe(false);
    expect(shallowEqual([1, 2], [1])).toBe(false);
  });

  test('arrays with the same entries', ({ expect }) => {
    const subject = { id: 'x' };
    expect(shallowEqual([subject], [subject])).toBe(true);
  });

  // Equal key counts with different names: both sides resolve the missing key to `undefined`, so
  // the value comparison alone reports equal.
  test('differing key names with undefined values', ({ expect }) => {
    expect(shallowEqual({ a: undefined }, { b: undefined })).toBe(false);
  });

  test('a key present on one side only, holding undefined', ({ expect }) => {
    expect(shallowEqual({ a: 1, b: undefined }, { a: 1, c: undefined })).toBe(false);
  });

  test('non-objects', ({ expect }) => {
    expect(shallowEqual(1, 1)).toBe(true);
    expect(shallowEqual(1, 2)).toBe(false);
    expect(shallowEqual(null, {})).toBe(false);
    expect(shallowEqual(undefined, undefined)).toBe(true);
  });
});
