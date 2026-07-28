//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { ATMOSPHERE_METHOD, METHOD_ALIASES, normalizeAccessCode, validAccessCode } from './util';

describe('access codes', () => {
  test('accepts hyphenated, bare, and lower-case forms', () => {
    expect(validAccessCode('ABCD2345')).toBe(true);
    expect(validAccessCode('ABCD-2345')).toBe(true);
    expect(validAccessCode('abcd-2345')).toBe(true);
    expect(validAccessCode('  ABCD-2345  ')).toBe(true);
  });

  test('rejects wrong lengths, ambiguous letters, and misplaced hyphens', () => {
    expect(validAccessCode('ABCD234')).toBe(false);
    expect(validAccessCode('ABCD23456')).toBe(false);
    // I, L, O and U are absent from the Crockford alphabet.
    expect(validAccessCode('ABCI2345')).toBe(false);
    expect(validAccessCode('ABC-D2345')).toBe(false);
    expect(validAccessCode('')).toBe(false);
  });

  test('normalizes to the canonical form hub-service matches', () => {
    expect(normalizeAccessCode(' abcd-2345 ')).toBe('ABCD2345');
    expect(normalizeAccessCode('ABCD2345')).toBe('ABCD2345');
  });
});

describe('method aliases', () => {
  test('atproto resolves to the canonical Atmosphere method', () => {
    expect(METHOD_ALIASES.atproto).toBe(ATMOSPHERE_METHOD);
  });
});
