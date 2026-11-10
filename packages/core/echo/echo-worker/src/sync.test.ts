//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { isReset } from './sync.ts';

const A = 'incarnation-a';
const B = 'incarnation-b';

describe('isReset', () => {
  test('the same store is not a reset, however far its version has moved', () => {
    expect(isReset({ version: 30, incarnation: A }, { version: 30, incarnation: A })).toBe(false);
    expect(isReset({ version: 30, incarnation: A }, { version: 90, incarnation: A })).toBe(false);
  });

  test('a different store is a reset even where the version did not roll back', () => {
    // The case a version comparison cannot see: the graph expired, and another peer pushed the new
    // store back up to — or past — the version this client had saved.
    expect(isReset({ version: 30, incarnation: A }, { version: 30, incarnation: B })).toBe(true);
    expect(isReset({ version: 30, incarnation: A }, { version: 90, incarnation: B })).toBe(true);
    expect(isReset({ version: 30, incarnation: A }, { version: 4, incarnation: B })).toBe(true);
  });

  test('a first sync against a named store is not a reset', () => {
    expect(isReset({ version: 0 }, { version: 0, incarnation: A })).toBe(false);
    expect(isReset({ version: 0 }, { version: 12, incarnation: A })).toBe(false);
  });

  test('without an incarnation on either side, a lower version is still the signal', () => {
    // A store, or a saved state, from before the field; the old comparison is what is left.
    expect(isReset({ version: 30 }, { version: 4 })).toBe(true);
    expect(isReset({ version: 30 }, { version: 30 })).toBe(false);
    expect(isReset({ version: 30 }, { version: 90 })).toBe(false);
    expect(isReset({ version: 30, incarnation: A }, { version: 4 })).toBe(true);
    expect(isReset({ version: 30 }, { version: 4, incarnation: A })).toBe(true);
  });
});
