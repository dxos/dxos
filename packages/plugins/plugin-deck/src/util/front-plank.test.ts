//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { getFrontPlankIndex } from './front-plank.ts';

type Rect = { left: number; right: number; width: number };

const rect = (left: number, right: number): Rect => ({ left, right, width: right - left });
const viewport = rect(0, 1000);

describe('getFrontPlankIndex', () => {
  test('is the first unfolded plank with at least half its width in view', ({ expect }) => {
    expect(getFrontPlankIndex([rect(-600, 200), rect(200, 1000)], viewport, [false, false])).toBe(1);
    expect(getFrontPlankIndex([rect(-200, 600), rect(600, 1400)], viewport, [false, false])).toBe(0);
  });

  test('skips a folded plank', ({ expect }) => {
    expect(getFrontPlankIndex([rect(0, 800), rect(40, 840)], viewport, [true, false])).toBe(1);
  });

  test('counts only the part of a plank the next one does not cover', ({ expect }) => {
    // A sticky plank B slides over A, leaving 212 of A's 800 pixels in view.
    expect(getFrontPlankIndex([rect(0, 800), rect(212, 1012)], viewport, [false, false])).toBe(1);
  });

  test('is -1 when no plank qualifies', ({ expect }) => {
    expect(getFrontPlankIndex([rect(-800, 100)], viewport, [false])).toBe(-1);
  });
});
