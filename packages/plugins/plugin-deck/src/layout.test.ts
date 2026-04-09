//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { openEntry, openSubjectsOnActiveDeck } from './layout';

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
