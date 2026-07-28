//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { addSubjectsToActiveDeck } from './layout';

describe('addSubjectsToActiveDeck', () => {
  test('appends to the end without a pivot', () => {
    expect(addSubjectsToActiveDeck(['a', 'b'], ['c'])).toEqual(['a', 'b', 'c']);
  });

  test('appends multiple subjects in order', () => {
    expect(addSubjectsToActiveDeck(['a'], ['b', 'c'])).toEqual(['a', 'b', 'c']);
  });

  test('inserts immediately after the pivot without truncating', () => {
    expect(addSubjectsToActiveDeck(['a', 'b', 'c', 'd'], ['e'], { pivotId: 'a' })).toEqual(['a', 'e', 'b', 'c', 'd']);
  });

  test('inserts multiple subjects after the pivot in order', () => {
    expect(addSubjectsToActiveDeck(['a', 'b', 'c'], ['x', 'y'], { pivotId: 'a' })).toEqual(['a', 'x', 'y', 'b', 'c']);
  });

  test('appends to the end when pivot not in deck', () => {
    expect(addSubjectsToActiveDeck(['a', 'b'], ['c'], { pivotId: 'missing' })).toEqual(['a', 'b', 'c']);
  });

  test('subject already open keeps its position', () => {
    expect(addSubjectsToActiveDeck(['a', 'b', 'c'], ['b'])).toEqual(['a', 'b', 'c']);
    expect(addSubjectsToActiveDeck(['a', 'b', 'c'], ['c'], { pivotId: 'a' })).toEqual(['a', 'b', 'c']);
  });

  test('mixes already-open and new subjects', () => {
    expect(addSubjectsToActiveDeck(['a', 'b', 'c'], ['b', 'd'], { pivotId: 'a' })).toEqual(['a', 'd', 'b', 'c']);
  });

  test('replaces by key prefix in place instead of inserting', () => {
    expect(addSubjectsToActiveDeck(['foo+1', 'b'], ['foo+2'], { key: 'foo' })).toEqual(['foo+2', 'b']);
  });

  test('returns a copy when nothing changes', () => {
    const active = ['a', 'b'];
    const result = addSubjectsToActiveDeck(active, ['a']);
    expect(result).toEqual(active);
    expect(result).not.toBe(active);
  });
});
