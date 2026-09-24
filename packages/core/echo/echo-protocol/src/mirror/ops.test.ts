//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { freezeValue } from './ops.ts';

describe('freezeValue', () => {
  test('refuses what Automerge refuses when a document is created from a value', () => {
    expect(() => freezeValue({ title: undefined })).toThrow(/undefined at \/title/);
    expect(() => freezeValue({ list: [1, undefined] })).toThrow(/undefined at \/list\/1/);
    const sparse = new Array<number>(2);
    sparse[0] = 1;
    expect(() => freezeValue({ list: sparse })).toThrow(/undefined at \/list\/1/);
  });

  test('copies containers once and shares frozen ones', () => {
    const inner = freezeValue({ text: 'hello' });
    const outer = freezeValue({ inner, list: [inner] });
    expect(Object.isFrozen(outer)).toBe(true);
    expect(outer.inner).toBe(inner);
    expect(outer.list[0]).toBe(inner);
  });
});
