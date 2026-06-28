//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { sourceHash } from './hash';

describe('sourceHash', () => {
  test('returns the expected FNV-1a digest for known inputs', ({ expect }) => {
    // Pinned so a change to the algorithm or output format is caught; downstream code compares the
    // stored hash string verbatim across the StateEffect boundary.
    expect(sourceHash('')).toBe('811c9dc5');
    expect(sourceHash('a')).toBe('e40c292c');
  });

  test('is order-sensitive', ({ expect }) => {
    expect(sourceHash('the lazy dog')).not.toBe(sourceHash('the dog lazy'));
  });
});
