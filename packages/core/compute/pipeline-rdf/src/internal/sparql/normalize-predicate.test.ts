//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { normalizePredicate } from './normalize-predicate';

describe('normalizePredicate', () => {
  test('collapses case, whitespace, and inflection of the head verb', ({ expect }) => {
    const key = normalizePredicate('works at');
    expect(normalizePredicate('Works At')).toBe(key);
    expect(normalizePredicate('  works   at ')).toBe(key);
    expect(normalizePredicate('worked at')).toBe(key);
    expect(normalizePredicate('is working at')).toBe(key);
  });

  test('drops leading copula/article so "is a man" keys as "man"', ({ expect }) => {
    expect(normalizePredicate('is a man')).toBe('man');
    expect(normalizePredicate('man')).toBe('man');
  });

  test('does NOT merge true synonyms / different particles', ({ expect }) => {
    expect(normalizePredicate('works for')).not.toBe(normalizePredicate('works at'));
    expect(normalizePredicate('employed by')).not.toBe(normalizePredicate('works at'));
  });

  test('is idempotent', ({ expect }) => {
    const once = normalizePredicate('is leading');
    expect(normalizePredicate(once)).toBe(once);
  });
});
