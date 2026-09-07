//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { shallowEqual } from './shallowStable';

describe('shallowEqual', () => {
  test('same reference', ({ expect }) => {
    const value = { a: 1 };
    expect(shallowEqual(value, value)).toBe(true);
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

  // Only the top level is compared: a nested object is expected to carry a stable identity of its
  // own (an ECHO object is a singleton proxy), so a nested rebuild is a genuine change.
  test('nested objects are compared by identity', ({ expect }) => {
    expect(shallowEqual({ a: { b: 1 } }, { a: { b: 1 } })).toBe(false);
  });

  test('non-objects', ({ expect }) => {
    expect(shallowEqual(1, 1)).toBe(true);
    expect(shallowEqual(1, 2)).toBe(false);
    expect(shallowEqual(null, {})).toBe(false);
    expect(shallowEqual(undefined, undefined)).toBe(true);
  });
});
