//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type Bounds } from '../model/types.ts';
import { resizeBounds } from './resize.ts';

const start: Bounds = { x: 100, y: 100, width: 200, height: 100 };
const minSize = { width: 64, height: 32 };
const snap = (value: number) => Math.round(value / 64) * 64;

describe('resizeBounds', () => {
  test('a moving edge lands on the snap and the opposite edge stays put', ({ expect }) => {
    // East edge 300 + 50 → 350 → snapped to 320.
    expect(resizeBounds(start, 'e', { x: 50, y: 0 }, { minSize, snap })).toEqual({ ...start, width: 220 });
    // West edge 100 - 40 → 60 → snapped to 64; the east edge stays at 300.
    expect(resizeBounds(start, 'w', { x: -40, y: 0 }, { minSize, snap })).toEqual({ ...start, x: 64, width: 236 });
    // A corner moves both axes; `n` keeps the bottom edge.
    expect(resizeBounds(start, 'ne', { x: 20, y: -28 }, { minSize })).toEqual({
      x: 100,
      y: 72,
      width: 220,
      height: 128,
    });
  });

  test('the size clamps to the limits, keeping the fixed edge', ({ expect }) => {
    expect(resizeBounds(start, 'w', { x: 300, y: 0 }, { minSize })).toEqual({ ...start, x: 236, width: 64 });
    expect(resizeBounds(start, 'se', { x: 500, y: 500 }, { minSize, maxSize: { width: 256, height: 128 } })).toEqual({
      ...start,
      width: 256,
      height: 128,
    });
  });

  test('symmetric resize keeps the centre and moves both edges', ({ expect }) => {
    const grown = resizeBounds(start, 'e', { x: 30, y: 0 }, { minSize, symmetric: true });
    expect(grown).toEqual({ x: 70, y: 100, width: 260, height: 100 });
    const shrunk = resizeBounds(start, 'n', { x: 0, y: 20 }, { minSize, symmetric: true });
    expect(shrunk).toEqual({ x: 100, y: 120, width: 200, height: 60 });
    // Limits apply about the centre too.
    const clamped = resizeBounds(start, 'w', { x: 200, y: 0 }, { minSize, symmetric: true });
    expect(clamped).toEqual({ x: 168, y: 100, width: 64, height: 100 });
  });
});
