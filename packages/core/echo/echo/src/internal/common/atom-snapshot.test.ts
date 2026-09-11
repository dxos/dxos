//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { snapshotEquals, snapshotForComparison } from './atom-snapshot.ts';

describe('snapshotEquals', () => {
  test('an array holding a record always compares unequal', ({ expect }) => {
    // The snapshot shallow-copies the array, so a record element mutated in place is the same
    // reference on both sides: comparing it by identity would report no change and the atom would
    // never notify. Records therefore compare unequal whether or not they were touched.
    const value = [{ ids: ['a'] }];
    const snapshot = snapshotForComparison(value);
    expect(snapshotEquals(value, snapshot)).toBe(false);

    value[0].ids.push('b');
    expect(snapshotEquals(value, snapshot)).toBe(false);
  });

  test('an array of scalars compares by content', ({ expect }) => {
    const value = ['a', 'b'];
    const snapshot = snapshotForComparison(value);
    expect(snapshotEquals(value, snapshot)).toBe(true);
    expect(snapshotEquals(['a', 'c'], snapshot)).toBe(false);
    expect(snapshotEquals(['a'], snapshot)).toBe(false);
  });
});
