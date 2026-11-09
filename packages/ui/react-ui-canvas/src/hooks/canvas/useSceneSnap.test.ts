//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { DEFAULT_GRID, MAJOR_GRID } from '@dxos/scene';

import { DETENT_PX, resizeBounds } from '../../utils/index.ts';
import { sceneSnap } from './useSceneSnap.ts';

// At 79% the quarter level is under the legible spacing, so the drawn levels are the grid and its major.
const ZOOM = 0.79;

const onMajor = (value: number) => Math.abs(value % MAJOR_GRID) === 0;

describe('sceneSnap', () => {
  test('reads the drawn levels from the zoom', ({ expect }) => {
    const { minor, major } = sceneSnap(DEFAULT_GRID, ZOOM, true);
    expect([minor, major]).toEqual([DEFAULT_GRID, MAJOR_GRID]);
  });

  test('a move holds the pressed node on the major grid within the detent and follows the pointer outside it', ({
    expect,
  }) => {
    const { moveDelta, detent } = sceneSnap(DEFAULT_GRID, ZOOM, true);
    expect(detent).toBeCloseTo(DETENT_PX / ZOOM);
    const anchor = { x: MAJOR_GRID, y: MAJOR_GRID };
    // Each axis on its own: x is 2 short of the next cell and y 3 past this one, both inside the detent, so both hold.
    expect(moveDelta(anchor, { x: MAJOR_GRID - 2, y: 3 })).toEqual({ x: MAJOR_GRID, y: 0 });
    // x is past the detent of either line, so it follows the pointer while y still holds.
    const loose = Math.round(MAJOR_GRID / 2) - 2;
    expect(moveDelta(anchor, { x: loose, y: 3 })).toEqual({ x: loose, y: 0 });
    // Entering and leaving the detent moves the node by the detent at most, never by half a cell.
    const xs = Array.from({ length: 80 }, (_, step) => anchor.x + moveDelta(anchor, { x: step, y: 0 }).x);
    const steps = xs.slice(1).map((x, index) => Math.abs(x - xs[index]));
    expect(Math.max(...steps)).toBeLessThanOrEqual(detent + 1);
  });

  test('a resize lands the moving edge on the major grid and keeps the opposite edge', ({ expect }) => {
    const { snap, major } = sceneSnap(DEFAULT_GRID, ZOOM, true);
    const start = { x: MAJOR_GRID, y: MAJOR_GRID, width: MAJOR_GRID * 2, height: MAJOR_GRID };
    const bounds = resizeBounds(
      start,
      'se',
      { x: Math.round(MAJOR_GRID * 0.8), y: Math.round(MAJOR_GRID * 0.4) },
      { minSize: { width: major, height: major }, snap },
    );
    expect(bounds).toEqual({ x: MAJOR_GRID, y: MAJOR_GRID, width: MAJOR_GRID * 3, height: MAJOR_GRID });
    expect([bounds.x + bounds.width, bounds.y + bounds.height].every(onMajor)).toBe(true);
  });

  test("a click's jitter does not snap a node that sits off the major grid", ({ expect }) => {
    const { moveDelta, isClick } = sceneSnap(DEFAULT_GRID, ZOOM, true);
    // A palette drop leaves the node on the minor grid.
    const anchor = { x: DEFAULT_GRID, y: DEFAULT_GRID };
    expect(moveDelta(anchor, { x: 1, y: 1 })).toEqual({ x: 0, y: 0 });
    expect(isClick({ x: 1, y: 1 })).toBe(true);
    // Past half a minor cell the press is a drag, and a node this far from a major line follows the pointer.
    const drag = DEFAULT_GRID / 2 + 1;
    expect(isClick({ x: drag, y: 0 })).toBe(false);
    expect(moveDelta(anchor, { x: drag, y: 0 })).toEqual({ x: drag, y: 0 });
  });

  test('control points keep the minor grid', ({ expect }) => {
    const { snapMinor } = sceneSnap(DEFAULT_GRID, ZOOM, true);
    expect(snapMinor(DEFAULT_GRID * 2 - 1)).toBe(DEFAULT_GRID * 2);
  });

  test('with snap off a move follows the pointer', ({ expect }) => {
    const { moveDelta } = sceneSnap(DEFAULT_GRID, ZOOM, false);
    expect(moveDelta({ x: MAJOR_GRID, y: MAJOR_GRID }, { x: 37, y: 23 })).toEqual({ x: 37, y: 23 });
  });
});
