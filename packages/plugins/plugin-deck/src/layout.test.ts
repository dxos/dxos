//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { openEntry, openSubjectsOnActiveDeck, replaceSubjectsOnActiveDeck, resolveDisposition } from './layout';

describe('openEntry', () => {
  test('pushes new id to the end', () => {
    expect(openEntry(['a', 'b'], 'c')).toEqual(['a', 'b', 'c']);
  });

  test('no-op when id already present', () => {
    expect(openEntry(['a', 'b'], 'a')).toEqual(['a', 'b']);
  });

  test('replaces by key prefix when key matches', () => {
    expect(openEntry(['foo+1', 'b'], 'foo+2', { key: 'foo' })).toEqual(['foo+2', 'b']);
  });
});

describe('openSubjectsOnActiveDeck', () => {
  test('truncates after pivot then appends one subject', () => {
    expect(openSubjectsOnActiveDeck(['a', 'b', 'c', 'd'], ['e'], { pivotId: 'a' })).toEqual(['a', 'e']);
  });

  test('appends to end when pivot not in deck', () => {
    expect(openSubjectsOnActiveDeck(['a', 'b'], ['c'], { pivotId: 'missing' })).toEqual(['a', 'b', 'c']);
  });

  test('without pivotId appends each subject to the end', () => {
    expect(openSubjectsOnActiveDeck(['a'], ['b', 'c'], {})).toEqual(['a', 'b', 'c']);
  });

  test('with pivot keeps all new subjects after truncate', () => {
    expect(openSubjectsOnActiveDeck(['a', 'b', 'c'], ['x', 'y'], { pivotId: 'a' })).toEqual(['a', 'x', 'y']);
  });

  test('passes key through to openEntry', () => {
    expect(openSubjectsOnActiveDeck(['foo+1'], ['foo+2'], { key: 'foo' })).toEqual(['foo+2']);
  });

  test('returns deck unchanged when subject is already open (no pivot)', () => {
    expect(openSubjectsOnActiveDeck(['a', 'b', 'c'], ['b'])).toEqual(['a', 'b', 'c']);
  });

  test('returns deck unchanged when subject is already open (with pivot)', () => {
    expect(openSubjectsOnActiveDeck(['a', 'b', 'c'], ['c'], { pivotId: 'a' })).toEqual(['a', 'b', 'c']);
  });

  test('returns deck unchanged when all subjects are already open', () => {
    expect(openSubjectsOnActiveDeck(['a', 'b', 'c'], ['b', 'c'], { pivotId: 'a' })).toEqual(['a', 'b', 'c']);
  });

  test('truncates after pivot when subject is new even if some are already open', () => {
    expect(openSubjectsOnActiveDeck(['a', 'b', 'c'], ['b', 'd'], { pivotId: 'a' })).toEqual(['a', 'b', 'd']);
  });
});

describe('replaceSubjectsOnActiveDeck', () => {
  test('replaces the plank at the pivot index', () => {
    expect(replaceSubjectsOnActiveDeck(['a', 'b', 'c'], ['x'], { index: 1 })).toEqual(['a', 'x', 'c']);
  });

  test('replaces the first plank', () => {
    expect(replaceSubjectsOnActiveDeck(['a', 'b', 'c'], ['x'], { index: 0 })).toEqual(['x', 'b', 'c']);
  });

  test('multi-subject replace inserts all subjects at the replaced index', () => {
    expect(replaceSubjectsOnActiveDeck(['a', 'b', 'c'], ['x', 'y'], { index: 1 })).toEqual(['a', 'x', 'y', 'c']);
  });

  test('a subject already open elsewhere relocates into the replaced slot instead of duplicating', () => {
    expect(replaceSubjectsOnActiveDeck(['a', 'b', 'c'], ['c'], { index: 0 })).toEqual(['c', 'b']);
  });

  test('no-op (returns a copy) when subject is empty', () => {
    const active = ['a', 'b'];
    const result = replaceSubjectsOnActiveDeck(active, [], { index: 0 });
    expect(result).toEqual(active);
    expect(result).not.toBe(active);
  });
});

describe('resolveDisposition', () => {
  test('undefined defers to the setting', () => {
    expect(resolveDisposition('replace', undefined)).toBe('replace');
    expect(resolveDisposition('new-plank', undefined)).toBe('new-plank');
  });

  test("'default' defers to the setting", () => {
    expect(resolveDisposition('replace', 'default')).toBe('replace');
    expect(resolveDisposition('new-plank', 'default')).toBe('new-plank');
  });

  test("'inverse' flips the setting, symmetrically", () => {
    expect(resolveDisposition('replace', 'inverse')).toBe('new-plank');
    expect(resolveDisposition('new-plank', 'inverse')).toBe('replace');
  });

  test('explicit values pass through regardless of the setting', () => {
    expect(resolveDisposition('replace', 'replace')).toBe('replace');
    expect(resolveDisposition('replace', 'new-plank')).toBe('new-plank');
    expect(resolveDisposition('new-plank', 'replace')).toBe('replace');
    expect(resolveDisposition('new-plank', 'new-plank')).toBe('new-plank');
  });
});
