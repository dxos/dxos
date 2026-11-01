//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { DEFAULT_GRID } from '@dxos/scene';

import { resizeBounds } from '../../utils/index.ts';
import { DETENT_PX, sceneSnap } from './useSceneSnap.ts';

// At 79% the 4px level is under the legible spacing, so the drawn levels are 16 (minor) and 64 (major).
const ZOOM = 0.79;
const MAJOR = 64;

const onMajor = (value: number) => Math.abs(value % MAJOR) === 0;

describe('sceneSnap', () => {
  test('reads the drawn levels from the zoom', ({ expect }) => {
    const { minor, major } = sceneSnap(DEFAULT_GRID, ZOOM, true);
    expect([minor, major]).toEqual([16, MAJOR]);
  });

  test('a move holds the pressed node on the major grid within the detent and follows the pointer outside it', ({
    expect,
  }) => {
    const { moveDelta, detent } = sceneSnap(DEFAULT_GRID, ZOOM, true);
    expect(detent).toBeCloseTo(DETENT_PX / ZOOM);
    const anchor = { x: 64, y: 64 };
    // Each axis on its own: x is 2 short of 128 and y 3 past 64, both inside the detent, so both hold.
    expect(moveDelta(anchor, { x: 62, y: 3 })).toEqual({ x: 64, y: 0 });
    // x is 30 past 64, outside the detent, so it follows the pointer while y still holds.
    expect(moveDelta(anchor, { x: 30, y: 3 })).toEqual({ x: 30, y: 0 });
    // Entering and leaving the detent moves the node by the detent at most, never by half a cell.
    const xs = Array.from({ length: 80 }, (_, step) => anchor.x + moveDelta(anchor, { x: step, y: 0 }).x);
    const steps = xs.slice(1).map((x, index) => Math.abs(x - xs[index]));
    expect(Math.max(...steps)).toBeLessThanOrEqual(detent + 1);
  });

  test('a resize lands the moving edge on the major grid and keeps the opposite edge', ({ expect }) => {
    const { snap, major } = sceneSnap(DEFAULT_GRID, ZOOM, true);
    const start = { x: 64, y: 64, width: 128, height: 64 };
    const bounds = resizeBounds(start, 'se', { x: 40, y: 20 }, { minSize: { width: major, height: major }, snap });
    expect(bounds).toEqual({ x: 64, y: 64, width: 192, height: 64 });
    expect([bounds.x + bounds.width, bounds.y + bounds.height].every(onMajor)).toBe(true);
  });

  test("a click's jitter does not snap a node that sits off the major grid", ({ expect }) => {
    const { moveDelta, isClick } = sceneSnap(DEFAULT_GRID, ZOOM, true);
    // A palette drop leaves the node on the minor grid.
    const anchor = { x: 16, y: 16 };
    expect(moveDelta(anchor, { x: 1, y: 1 })).toEqual({ x: 0, y: 0 });
    expect(isClick({ x: 1, y: 1 })).toBe(true);
    // Past half a minor cell the press is a drag, and a node this far from a major line follows the pointer.
    expect(isClick({ x: 8, y: 0 })).toBe(false);
    expect(moveDelta(anchor, { x: 8, y: 0 })).toEqual({ x: 8, y: 0 });
  });

  test('control points keep the minor grid', ({ expect }) => {
    const { snapMinor } = sceneSnap(DEFAULT_GRID, ZOOM, true);
    expect(snapMinor(23)).toBe(16);
  });

  test('with snap off a move follows the pointer', ({ expect }) => {
    const { moveDelta } = sceneSnap(DEFAULT_GRID, ZOOM, false);
    expect(moveDelta({ x: 64, y: 64 }, { x: 37, y: 23 })).toEqual({ x: 37, y: 23 });
  });
});
