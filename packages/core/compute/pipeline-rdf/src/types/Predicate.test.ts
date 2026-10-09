//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Predicate from './Predicate.ts';

describe('Predicate.normalize', () => {
  test('collapses case, whitespace, and inflection of the head verb', ({ expect }) => {
    const key = Predicate.normalize('works at');
    expect(Predicate.normalize('Works At')).toBe(key);
    expect(Predicate.normalize('  works   at ')).toBe(key);
    expect(Predicate.normalize('worked at')).toBe(key);
    expect(Predicate.normalize('is working at')).toBe(key);
  });

  test('drops leading copula/article so "is a man" keys as "man"', ({ expect }) => {
    expect(Predicate.normalize('is a man')).toBe('man');
    expect(Predicate.normalize('man')).toBe('man');
  });

  test('does NOT merge true synonyms / different particles', ({ expect }) => {
    expect(Predicate.normalize('works for')).not.toBe(Predicate.normalize('works at'));
    expect(Predicate.normalize('employed by')).not.toBe(Predicate.normalize('works at'));
  });

  test('is idempotent', ({ expect }) => {
    const once = Predicate.normalize('is leading');
    expect(Predicate.normalize(once)).toBe(once);
  });
});
