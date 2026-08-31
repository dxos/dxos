//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { HEIGHT, VISIBLE_CHARACTERS, WIDTH, overflows, textWidth, toPixels } from './pixels';

const lit = (pixels: boolean[][]) => pixels.flat().filter(Boolean).length;

describe('toPixels', () => {
  test('rasterises to the device matrix', ({ expect }) => {
    const pixels = toPixels({ text: 'OK' });
    expect(pixels).toHaveLength(HEIGHT);
    expect(pixels[0]).toHaveLength(WIDTH);
  });

  test('a blank frame lights nothing', ({ expect }) => {
    expect(lit(toPixels({ text: '   ' }))).toBe(0);
  });

  test('a goal frame draws a bar proportional to its ratio', ({ expect }) => {
    const half = toPixels({ goalData: { start: 0, current: 50, end: 100, unit: '%' } });
    const full = toPixels({ goalData: { start: 0, current: 100, end: 100, unit: '%' } });
    expect(half[HEIGHT - 1].filter(Boolean)).toHaveLength(Math.round(WIDTH / 2));
    expect(full[HEIGHT - 1].filter(Boolean)).toHaveLength(WIDTH);
  });

  test('a goal frame clamps a ratio outside its range', ({ expect }) => {
    const over = toPixels({ goalData: { start: 0, current: 500, end: 100, unit: '%' } });
    const under = toPixels({ goalData: { start: 0, current: -5, end: 100, unit: '%' } });
    expect(over[HEIGHT - 1].filter(Boolean)).toHaveLength(WIDTH);
    expect(under[HEIGHT - 1].filter(Boolean)).toHaveLength(0);
  });

  test('scrolling shifts the text left', ({ expect }) => {
    expect(toPixels({ text: 'ABCDEFGHIJKL' }, 0)).not.toEqual(toPixels({ text: 'ABCDEFGHIJKL' }, 4));
  });

  test('only nine characters fit, so a typical stat line scrolls', ({ expect }) => {
    expect(VISIBLE_CHARACTERS).toBe(9);
    expect(textWidth('42 objects')).toBeGreaterThan(WIDTH);
    expect(overflows({ text: '42 objects' })).toBe(true);
    expect(overflows({ text: '42 obj' })).toBe(false);
  });
});
