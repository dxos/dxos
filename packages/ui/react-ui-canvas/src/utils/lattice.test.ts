//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type HullNode, type Node, type RectNode } from '@dxos/scene';

import {
  type LatticeSpec,
  cellBounds,
  collides,
  coveredCells,
  latticeGrid,
  nearestFree,
  occupancy,
  quantize,
  reseat,
  reseatBounds,
  resizeCell,
  toCell,
} from './lattice.ts';
import { createNode } from './shapes.ts';

// The lattice these positions are worked out on: a pitch of 384 by 192.
const spec: LatticeSpec = { width: 256, height: 128, gutterX: 128, gutterY: 64 };

describe('lattice', () => {
  test('the lattice grid puts a major line on every cell edge', ({ expect }) => {
    const minor = latticeGrid(spec, 4);
    expect(minor).toBe(16);
    // A pitch the settings could not show falls back, so the canvas and its form agree.
    expect(latticeGrid({ width: 32, height: 16, gutterX: 8, gutterY: 8 }, 4)).toBe(0);
    // Too coarse a pitch takes the largest one in range that still lands on every cell edge.
    expect(latticeGrid({ width: 4096, height: 2048, gutterX: 2048, gutterY: 2048 }, 4)).toBe(128);
    for (let index = -2; index <= 2; index++) {
      const { x, y, width, height } = cellBounds({ col: index, row: index, spanX: 2, spanY: 1 }, spec);
      for (const edge of [x, x + width, y, y + height]) {
        expect(Math.abs(edge % (minor * 4))).toBe(0);
      }
    }
  });

  test('a one-cell shape is the spec size on its cell; a pitch is a shape plus a gutter', ({ expect }) => {
    expect(cellBounds({ col: 0, row: 0, spanX: 1, spanY: 1 }, spec)).toEqual({
      x: -128,
      y: -64,
      width: 256,
      height: 128,
    });
    expect(cellBounds({ col: 1, row: 1, spanX: 1, spanY: 1 }, spec)).toMatchObject({ x: 384 - 128, y: 192 - 64 });
  });

  test('a wider shape spans whole cells from its first and covers the gutters between them', ({ expect }) => {
    // Two cells: two shapes and one gutter wide, starting at the first cell's edge.
    expect(cellBounds({ col: 0, row: 0, spanX: 2, spanY: 1 }, spec)).toEqual({
      x: -128,
      y: -64,
      width: 640,
      height: 128,
    });
    expect(cellBounds({ col: 0, row: 0, spanX: 3, spanY: 1 }, spec).width).toBe(1024);
  });

  test('quantize snaps a frame to the nearest whole span at the nearest cells', ({ expect }) => {
    expect(quantize({ x: -100, y: -40, width: 230, height: 100 }, spec)).toEqual({
      x: -128,
      y: -64,
      width: 256,
      height: 128,
    });
    // About two cells wide is two cells, an even span like any other.
    expect(toCell({ x: -128, y: -64, width: 600, height: 128 }, spec)).toEqual({ col: 0, row: 0, spanX: 2, spanY: 1 });
    expect(toCell({ x: 0, y: 0, width: 10, height: 10 }, spec)).toMatchObject({ spanX: 1, spanY: 1 });
    const once = quantize({ x: 300, y: 170, width: 900, height: 300 }, spec);
    expect(quantize(once, spec)).toEqual(once);
  });

  test('dragging a face snaps it to the nearest cell edge and leaves the opposite face where it was', ({ expect }) => {
    const one = { col: 0, row: 0, spanX: 1, spanY: 1 };
    const from = cellBounds(one, spec);
    // East face dragged more than half a pitch right: two cells, the west face unmoved.
    const east = resizeCell(one, from, { ...from, width: from.width + 230 }, spec);
    expect(east).toEqual({ col: 0, row: 0, spanX: 2, spanY: 1 });
    expect(cellBounds(east, spec).x).toBe(from.x);
    // Less than half a pitch is not enough to step.
    expect(resizeCell(one, from, { ...from, width: from.width + 150 }, spec)).toEqual(one);
    // North face dragged up one pitch: one more row above, the south face unmoved.
    const north = resizeCell(one, from, { ...from, y: from.y - 192, height: from.height + 192 }, spec);
    expect(north).toEqual({ col: 0, row: -1, spanX: 1, spanY: 2 });
    expect(cellBounds(north, spec).y + cellBounds(north, spec).height).toBe(from.y + from.height);
    // Dragging a face past the opposite one stops at a single cell.
    expect(resizeCell(east, cellBounds(east, spec), { ...cellBounds(east, spec), width: 10 }, spec)).toEqual(one);
  });

  test('a shape covers every cell it spans; occupancy collides with them', ({ expect }) => {
    expect(coveredCells({ col: 0, row: 0, spanX: 3, spanY: 1 })).toEqual(['0,0', '1,0', '2,0']);
    const wide = createNode({
      type: 'rect',
      id: 'w',
      z: 'a',
      center: { x: 256, y: 0 },
      size: { width: 1024, height: 128 },
    });
    const occupied = occupancy([wide], spec);
    expect(collides({ col: 2, row: 0, spanX: 1, spanY: 1 }, occupied)).toBe(true);
    expect(collides({ col: 3, row: 0, spanX: 1, spanY: 1 }, occupied)).toBe(false);
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
    const free = { col: 3, row: 3, spanX: 1, spanY: 1 };
    expect(nearestFree(free, occupied)).toEqual(free);
    const moved = nearestFree({ col: 0, row: 0, spanX: 1, spanY: 1 }, occupied);
    expect(moved && collides(moved, occupied)).toBe(false);
    expect(moved && Math.max(Math.abs(moved.col), Math.abs(moved.row))).toBe(1);
  });

  test('a frame re-seated on another lattice keeps its cells, so it moves and resizes with them', ({ expect }) => {
    const wider = { width: 192, height: 96, gutterX: 96, gutterY: 96 };
    // One cell at column 2, row -1, and a frame spanning two columns from the origin.
    const single = cellBounds({ col: 2, row: -1, spanX: 1, spanY: 1 }, spec);
    const double = cellBounds({ col: 0, row: 0, spanX: 2, spanY: 1 }, spec);
    expect(reseatBounds(single, spec, wider)).toEqual(cellBounds({ col: 2, row: -1, spanX: 1, spanY: 1 }, wider));
    expect(reseatBounds(double, spec, wider)).toEqual({ x: -96, y: -48, width: 480, height: 96 });
    expect(reseatBounds(single, spec, spec)).toEqual(single);
  });

  test('a scene re-seats the shapes on its lattice and leaves a hull and a guide where they are', ({ expect }) => {
    const wider = { width: 192, height: 96, gutterX: 96, gutterY: 96 };
    const frame = { z: 'a0', center: { x: 384, y: 192 }, size: { width: 256, height: 128 } };
    const shape: RectNode = { type: 'rect', id: 'a', ...frame };
    const guide: RectNode = { type: 'rect', id: 'g', ...frame, style: { guide: true } };
    const hull: HullNode = { type: 'hull', id: 'h', ...frame };
    const scene: { id: string; nodes: Record<string, Node> } = { id: 's', nodes: { a: shape, g: guide, h: hull } };
    const seated = reseat(scene, spec, wider);
    expect([seated.nodes.a.center, seated.nodes.a.size]).toEqual([
      { x: 288, y: 192 },
      { width: 192, height: 96 },
    ]);
    expect([seated.nodes.g, seated.nodes.h, seated.id]).toEqual([guide, hull, 's']);
  });
});
