//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { getFallbackGlyph } from './fallback';

describe('avatar fallback glyph', () => {
  test('a label initialises to at most two letters', ({ expect }) => {
    expect(getFallbackGlyph('Alice Smith')).toBe('AS');
    expect(getFallbackGlyph('alice')).toBe('A');
    expect(getFallbackGlyph('Ada Byron Lovelace')).toBe('AB');
  });

  test('an emoji renders as itself', ({ expect }) => {
    expect(getFallbackGlyph('👻')).toBe('👻');
    expect(getFallbackGlyph('🫥')).toBe('🫥');
  });

  test('text-presentation emoji render rather than initialising to nothing', ({ expect }) => {
    // The `idEmoji` palette entries that `\p{Emoji_Presentation}` rejects, which previously left
    // the avatar a coloured circle with no symbol.
    for (const emoji of ['👁️', '🐿️', '☀️', '☄️', '☁️', '⛱️', '🌶️', '🏔️', '🏝️', '🛰️', '🎙️', '⚙️', '🌡️', '🛎️', '♻️']) {
      expect(getFallbackGlyph(emoji)).toBe(emoji);
    }
  });

  test('a label wins over an emoji it contains', ({ expect }) => {
    expect(getFallbackGlyph('Alice ☀️')).toBe('A');
    expect(getFallbackGlyph('Alice 😀')).toBe('A');
  });

  test('non-latin labels initialise', ({ expect }) => {
    expect(getFallbackGlyph('北京')).toBe('北');
    expect(getFallbackGlyph('Ольга Иванова')).toBe('ОИ');
  });

  test('an empty fallback renders nothing', ({ expect }) => {
    expect(getFallbackGlyph('')).toBe('');
    expect(getFallbackGlyph()).toBe('');
  });
});
