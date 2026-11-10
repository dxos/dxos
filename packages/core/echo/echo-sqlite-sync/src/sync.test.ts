//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { isReset } from './sync.ts';

describe('isReset', () => {
  test('the same store is not a reset', () => {
    expect(isReset({ incarnation: 'a' }, { incarnation: 'a' })).toBe(false);
  });

  test('a different store is a reset, whatever its seq', () => {
    expect(isReset({ incarnation: 'a' }, { incarnation: 'b' })).toBe(true);
  });

  test('a first sync is not a reset', () => {
    expect(isReset({}, { incarnation: 'a' })).toBe(false);
  });
});
