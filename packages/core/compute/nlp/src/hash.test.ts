//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { sourceHash } from './hash';

describe('sourceHash', () => {
  test('is stable and order-sensitive', ({ expect }) => {
    expect(sourceHash('the lazy dog')).toBe(sourceHash('the lazy dog'));
    expect(sourceHash('the lazy dog')).not.toBe(sourceHash('the dog lazy'));
  });

  test('empty string hashes deterministically', ({ expect }) => {
    expect(sourceHash('')).toBe(sourceHash(''));
  });
});
