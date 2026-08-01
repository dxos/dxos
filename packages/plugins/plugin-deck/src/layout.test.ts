//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { addSubjectsToActiveDeck, updatePlankNames } from './layout';

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

  test('a named open replaces the plank holding that name, in place', () => {
    expect(addSubjectsToActiveDeck(['a', 'b'], ['c'], { replaceId: 'a' })).toEqual(['c', 'b']);
  });

  test('only the first subject takes the name; the rest insert after it', () => {
    expect(addSubjectsToActiveDeck(['a', 'b'], ['c', 'd'], { replaceId: 'a' })).toEqual(['c', 'd', 'b']);
  });

  test('a name whose plank is gone falls back to inserting', () => {
    expect(addSubjectsToActiveDeck(['a', 'b'], ['c'], { replaceId: 'missing' })).toEqual(['a', 'b', 'c']);
  });

  test('returns a copy when nothing changes', () => {
    const active = ['a', 'b'];
    const result = addSubjectsToActiveDeck(active, ['a']);
    expect(result).toEqual(active);
    expect(result).not.toBe(active);
  });
});

describe('updatePlankNames', () => {
  test('binds a name to the plank that took it', () => {
    expect(updatePlankNames({}, ['a'], { name: 'message', plankId: 'a' })).toEqual({ message: 'a' });
  });

  test('rebinds a name to the plank that replaced its occupant', () => {
    expect(updatePlankNames({ message: 'a' }, ['b'], { name: 'message', plankId: 'b' })).toEqual({ message: 'b' });
  });

  test('drops names whose plank is no longer open', () => {
    expect(updatePlankNames({ message: 'a', other: 'b' }, ['b'])).toEqual({ other: 'b' });
  });

  test('ignores a binding to a plank that did not end up open', () => {
    expect(updatePlankNames({}, ['a'], { name: 'message', plankId: 'gone' })).toEqual({});
  });
});
