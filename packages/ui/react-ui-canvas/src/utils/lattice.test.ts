//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import {
  DEFAULT_LATTICE,
  cellBounds,
  collides,
  coveredCells,
  nearestFree,
  occupancy,
  quantize,
  toCell,
} from './lattice.ts';
import { createNode } from './shapes.ts';

const spec = DEFAULT_LATTICE;

describe('lattice', () => {
  test('a one-cell shape is the spec size, centred on a cell centre', ({ expect }) => {
    expect(cellBounds({ col: 0, row: 0, spanX: 1, spanY: 1 }, spec)).toEqual({
      x: -128,
      y: -64,
      width: 256,
      height: 128,
    });
    // One column over is one pitch (shape plus gutter) away.
    expect(cellBounds({ col: 1, row: 1, spanX: 1, spanY: 1 }, spec)).toMatchObject({ x: 384 - 128, y: 192 - 64 });
  });

  test('a wider shape spans an odd number of cells and covers the gutters between them', ({ expect }) => {
    // 3x1: three shapes and two gutters wide.
    expect(cellBounds({ col: 0, row: 0, spanX: 3, spanY: 1 }, spec)).toEqual({
      x: -512,
      y: -64,
      width: 1024,
      height: 128,
    });
  });

  test('quantize snaps a frame to the nearest cell centre and odd span', ({ expect }) => {
    // Slightly off a cell, about one cell in size.
    expect(quantize({ x: -100, y: -40, width: 230, height: 100 }, spec)).toEqual({
      x: -128,
      y: -64,
      width: 256,
      height: 128,
    });
    // Two cells wide rounds to three, never to an even span (whose centre would sit on a gutter).
    expect(toCell({ x: 0, y: 0, width: 640, height: 128 }, spec)).toMatchObject({ spanX: 3, spanY: 1 });
    // Anything smaller than a cell is one cell.
    expect(toCell({ x: 0, y: 0, width: 10, height: 10 }, spec)).toMatchObject({ spanX: 1, spanY: 1 });
    // Quantizing is idempotent.
    const once = quantize({ x: 300, y: 170, width: 900, height: 300 }, spec);
    expect(quantize(once, spec)).toEqual(once);
  });

  test('a shape covers every position it spans; occupancy collides with them', ({ expect }) => {
    expect(coveredCells({ col: 0, row: 0, spanX: 3, spanY: 1 })).toEqual(['-1,0', '0,0', '1,0']);
    const wide = createNode({
      type: 'rect',
      id: 'w',
      z: 'a',
      center: { x: 0, y: 0 },
      size: { width: 1024, height: 128 },
    });
    const occupied = occupancy([wide], spec);
    expect(collides({ col: 1, row: 0, spanX: 1, spanY: 1 }, occupied)).toBe(true);
    expect(collides({ col: 2, row: 0, spanX: 1, spanY: 1 }, occupied)).toBe(false);
    // A node being moved does not collide with itself.
    expect(collides({ col: 0, row: 0, spanX: 1, spanY: 1 }, occupancy([wide], spec, new Set(['w'])))).toBe(false);
  });

  test('the nearest free cell keeps the span and is the cell itself when free', ({ expect }) => {
    const blocker = createNode({
      type: 'rect',
      id: 'b',
      z: 'a',
      center: { x: 0, y: 0 },
      size: { width: 256, height: 128 },
    });
    const occupied = occupancy([blocker], spec);
    expect(nearestFree({ col: 3, row: 3, spanX: 1, spanY: 1 }, occupied)).toEqual({
      col: 3,
      row: 3,
      spanX: 1,
      spanY: 1,
    });
    const moved = nearestFree({ col: 0, row: 0, spanX: 1, spanY: 1 }, occupied);
    expect(moved).toBeDefined();
    expect(moved && collides(moved, occupied)).toBe(false);
    expect(moved && Math.max(Math.abs(moved.col), Math.abs(moved.row))).toBe(1);
  });
});
