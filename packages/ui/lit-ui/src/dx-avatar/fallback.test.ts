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
      '👻',
      '👁️',
      '🐿️',
      '☀️',
      '☄️',
      '☁️',
      '⛱️',
      '🌶️',
      '🏔️',
      '🏝️',
      '🛰️',
      '🎙️',
      '⚙️',
      '🌡️',
      '🛎️',
      '♻️',
    ]) {
      expect(getFallbackGlyph(emoji)).toBe(emoji);
    }
  });
});
