//
// Copyright 2026 DXOS.org
//

import * as LaMetric from '#protocol';

import { GLYPH_HEIGHT, GLYPH_PITCH, GLYPH_WIDTH, glyphPixel } from './font.ts';

/** The device's white matrix. The 8x8 colour block to its left is not modelled. */
export const WIDTH = 37;
export const HEIGHT = 8;

/** Leaves a blank row above and two below, which is where the device puts a 5-pixel glyph. */
const TEXT_TOP = 1;

/** How many characters are visible at once, before the device starts scrolling. */
export const VISIBLE_CHARACTERS = Math.floor((WIDTH + 1) / GLYPH_PITCH);

const blank = (): boolean[][] => Array.from({ length: HEIGHT }, () => Array.from({ length: WIDTH }, () => false));

const drawText = (pixels: boolean[][], text: string, offset: number): void => {
  for (let index = 0; index < text.length; index++) {
    const left = index * GLYPH_PITCH - offset;
    if (left + GLYPH_WIDTH < 0 || left >= WIDTH) {
      continue;
    }

    for (let row = 0; row < GLYPH_HEIGHT; row++) {
      for (let column = 0; column < GLYPH_WIDTH; column++) {
        const x = left + column;
        if (x >= 0 && x < WIDTH && glyphPixel(text[index], column, row)) {
          pixels[TEXT_TOP + row][x] = true;
        }
      }
    }
  }
};

/**
 * Rasterises one frame the way the device would.
 *
 * Pure and separate from the component so the question that actually matters — does this text fit on
 * 37 pixels — is answered by a test rather than by squinting at a screenshot.
 *
 * `offset` is the horizontal scroll position, which the replica animates for text too long to fit.
 */
export const toPixels = (frame: LaMetric.Frame, offset = 0): boolean[][] => {
  const pixels = blank();

  if ('text' in frame) {
    drawText(pixels, frame.text, offset);
    return pixels;
  }

  const { start, current, end } = frame.goalData;
  const span = end - start;
  const ratio = span > 0 ? Math.max(0, Math.min(1, (current - start) / span)) : 0;
  const percentage = `${Math.round(ratio * 100)}%`;

  drawText(pixels, percentage, 0);
  // The device draws its own bar for a goal frame; the replica puts it on the bottom row.
  for (let x = 0; x < Math.round(ratio * WIDTH); x++) {
    pixels[HEIGHT - 1][x] = true;
  }

  return pixels;
};

/** Total scroll width of a text frame, so the replica knows when to wrap its animation. */
export const textWidth = (text: string): number => Math.max(0, text.length * GLYPH_PITCH - 1);

/** Whether the frame's text is wider than the matrix, i.e. the device will scroll it. */
export const overflows = (frame: LaMetric.Frame): boolean => 'text' in frame && textWidth(frame.text) > WIDTH;
