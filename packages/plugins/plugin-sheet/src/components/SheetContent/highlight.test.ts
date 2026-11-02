//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { highlightForeground } from './highlight.ts';

describe('highlightForeground', () => {
  test('a color outside the theme palette takes the text color with the higher contrast', ({ expect }) => {
    expect(highlightForeground('oklch(94.8% 0.028 342.258)')).toBe('black');
    expect(highlightForeground('oklch(0.488 0.243 264.376)')).toBe('white');
    // A midtone: black text has about 7:1 contrast against it, white under 3:1.
    expect(highlightForeground('oklch(68% 0 123)')).toBe('black');
  });

  test('no highlight, or a color it cannot read, keeps the grid text color', ({ expect }) => {
    expect(highlightForeground(undefined)).toBeUndefined();
    expect(highlightForeground('#ff0000')).toBeUndefined();
  });
});
