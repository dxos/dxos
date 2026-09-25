//
// Copyright 2026 DXOS.org
//

/**
 * A 3x5 pixel font, which is what fits on the device's 8-pixel-tall matrix with a row to spare.
 *
 * Deliberately approximate: it exists so the on-screen replica shows how much text actually fits on
 * 37 pixels, not to reproduce LaMetric's own glyphs. Lowercase maps to uppercase, and an unknown
 * character renders blank rather than throwing — a display is not worth an exception.
 */
export const GLYPH_WIDTH = 3;
export const GLYPH_HEIGHT = 5;

/** One blank column between glyphs, so a character occupies four pixels of width. */
export const GLYPH_PITCH = GLYPH_WIDTH + 1;

// prettier-ignore
const GLYPHS: Record<string, string> = {
  '0': '###' + '#.#' + '#.#' + '#.#' + '###',
  '1': '.#.' + '##.' + '.#.' + '.#.' + '###',
  '2': '###' + '..#' + '###' + '#..' + '###',
  '3': '###' + '..#' + '###' + '..#' + '###',
  '4': '#.#' + '#.#' + '###' + '..#' + '..#',
  '5': '###' + '#..' + '###' + '..#' + '###',
  '6': '###' + '#..' + '###' + '#.#' + '###',
  '7': '###' + '..#' + '..#' + '..#' + '..#',
  '8': '###' + '#.#' + '###' + '#.#' + '###',
  '9': '###' + '#.#' + '###' + '..#' + '###',
  'A': '###' + '#.#' + '###' + '#.#' + '#.#',
  'B' : '##.' + '#.#' + '##.' + '#.#' + '##.',
  'C': '###' + '#..' + '#..' + '#..' + '###',
  'D': '##.' + '#.#' + '#.#' + '#.#' + '##.',
  'E': '###' + '#..' + '###' + '#..' + '###',
  'F': '###' + '#..' + '###' + '#..' + '#..',
  'G': '###' + '#..' + '#.#' + '#.#' + '###',
  'H': '#.#' + '#.#' + '###' + '#.#' + '#.#',
  'I': '###' + '.#.' + '.#.' + '.#.' + '###',
  'J': '..#' + '..#' + '..#' + '#.#' + '###',
  'K': '#.#' + '#.#' + '##.' + '#.#' + '#.#',
  'L': '#..' + '#..' + '#..' + '#..' + '###',
  'M': '#.#' + '###' + '###' + '#.#' + '#.#',
  'N': '##.' + '#.#' + '#.#' + '#.#' + '#.#',
  'O': '###' + '#.#' + '#.#' + '#.#' + '###',
  'P': '###' + '#.#' + '###' + '#..' + '#..',
  'Q': '###' + '#.#' + '#.#' + '###' + '..#',
  'R': '###' + '#.#' + '##.' + '#.#' + '#.#',
  'S': '###' + '#..' + '###' + '..#' + '###',
  'T': '###' + '.#.' + '.#.' + '.#.' + '.#.',
  'U': '#.#' + '#.#' + '#.#' + '#.#' + '###',
  'V': '#.#' + '#.#' + '#.#' + '#.#' + '.#.',
  'W': '#.#' + '#.#' + '###' + '###' + '#.#',
  'X': '#.#' + '#.#' + '.#.' + '#.#' + '#.#',
  'Y': '#.#' + '#.#' + '.#.' + '.#.' + '.#.',
  'Z': '###' + '..#' + '.#.' + '#..' + '###',
  ' ': '...' + '...' + '...' + '...' + '...',
  '%': '#.#' + '..#' + '.#.' + '#..' + '#.#',
  '/': '..#' + '..#' + '.#.' + '#..' + '#..',
  '-': '...' + '...' + '###' + '...' + '...',
  '.': '...' + '...' + '...' + '...' + '.#.',
  ':': '...' + '.#.' + '...' + '.#.' + '...',
};

const BLANK = GLYPHS[' '];

/** Whether the glyph for `character` has a pixel lit at `(column, row)`. */
export const glyphPixel = (character: string, column: number, row: number): boolean =>
  (GLYPHS[character.toUpperCase()] ?? BLANK)[row * GLYPH_WIDTH + column] === '#';
