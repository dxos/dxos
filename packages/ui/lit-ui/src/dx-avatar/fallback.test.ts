//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { getFallbackGlyph } from './fallback.ts';

describe('getFallbackGlyph', () => {
  test('a label initialises to at most two letters', ({ expect }) => {
    expect(getFallbackGlyph('Ada Byron Lovelace')).toBe('AB');
  });

  test('an emoji renders as itself, including text-presentation emoji', ({ expect }) => {
    for (const emoji of [
      '\u{1F47B}',
      '\u{1F441}\uFE0F',
      '\u{1F43F}\uFE0F',
      '\u2600\uFE0F',
      '\u2604\uFE0F',
      '\u2601\uFE0F',
      '\u26F1\uFE0F',
      '\u{1F336}\uFE0F',
      '\u{1F3D4}\uFE0F',
      '\u{1F3DD}\uFE0F',
      '\u{1F6F0}\uFE0F',
      '\u{1F399}\uFE0F',
      '\u2699\uFE0F',
      '\u{1F321}\uFE0F',
      '\u{1F6CE}\uFE0F',
      '\u267B\uFE0F',
    ]) {
      expect(getFallbackGlyph(emoji)).toBe(emoji);
    }
  });
});
