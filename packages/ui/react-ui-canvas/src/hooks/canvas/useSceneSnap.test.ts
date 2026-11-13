//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { DEFAULT_GRID, MAJOR_GRID } from '@dxos/scene';

import { DETENT_PX, resizeBounds } from '../../utils/index.ts';
import { sceneSnap } from './useSceneSnap.ts';

// At 79% the quarter level is under the legible spacing, so the drawn levels are the grid and its major.
const ZOOM = 0.79;

const onGrid = (value: number) => Math.abs(value % DEFAULT_GRID) === 0;

describe('sceneSnap', () => {
  test('reads the drawn levels from the zoom', ({ expect }) => {
    const { minor, major } = sceneSnap(DEFAULT_GRID, ZOOM, true);
    expect([minor, major]).toEqual([DEFAULT_GRID, MAJOR_GRID]);
  });

  test('a gesture lands on the finest level drawn, not on the major one', ({ expect }) => {
    const { snap, minor } = sceneSnap(DEFAULT_GRID, ZOOM, true);
    // One cell past a major line stays there rather than being pulled back onto it.
    expect(snap(MAJOR_GRID + minor + 1)).toBe(MAJOR_GRID + minor);
    expect(snap(minor * 2 - 1)).toBe(minor * 2);
  });

  test('a move holds the pressed node on the grid within the detent and follows the pointer outside it', ({
    expect,
  }) => {
    const { moveDelta, detent, minor } = sceneSnap(DEFAULT_GRID, ZOOM, true);
    expect(detent).toBeCloseTo(DETENT_PX / ZOOM);
    const anchor = { x: MAJOR_GRID, y: MAJOR_GRID };
    // Each axis on its own: x is 2 short of a line and y 3 past one, both inside the detent, so both hold on it.
    expect(moveDelta(anchor, { x: minor * 4 - 2, y: 3 })).toEqual({ x: minor * 4, y: 0 });
    // Half a cell of the finest level is inside the detent at this zoom, so a move never comes to rest between two
    // lines: it steps one cell at a time, which is as far as it can jump.
    const xs = Array.from({ length: 80 }, (_, step) => anchor.x + moveDelta(anchor, { x: step, y: 0 }).x);
    const steps = xs.slice(1).map((x, index) => Math.abs(x - xs[index]));
    expect(Math.max(...steps)).toBe(minor);
    expect(xs.every(onGrid)).toBe(true);
  });

  test('a resize lands the moving edge on the grid and keeps the opposite edge', ({ expect }) => {
    const { snap, major } = sceneSnap(DEFAULT_GRID, ZOOM, true);
    const start = { x: MAJOR_GRID, y: MAJOR_GRID, width: MAJOR_GRID * 2, height: MAJOR_GRID };
    const bounds = resizeBounds(
      start,
      'se',
      { x: Math.round(MAJOR_GRID * 0.8), y: Math.round(MAJOR_GRID * 0.4) },
      { minSize: { width: major, height: major }, snap },
    );
    // The dragged corner lands on the nearest line of the finest level, which a major-only snap would have rounded
    // away: 38 and 19 past the corner give 36 and 24, not 48 and 0.
    expect(bounds).toEqual({ x: MAJOR_GRID, y: MAJOR_GRID, width: MAJOR_GRID * 2 + 36, height: MAJOR_GRID + 24 });
    expect([bounds.x + bounds.width, bounds.y + bounds.height].every(onGrid)).toBe(true);
  });

  test("a click's jitter moves nothing", ({ expect }) => {
    const { moveDelta, isClick } = sceneSnap(DEFAULT_GRID, ZOOM, true);
    const anchor = { x: DEFAULT_GRID, y: DEFAULT_GRID };
    expect(moveDelta(anchor, { x: 1, y: 1 })).toEqual({ x: 0, y: 0 });
    expect(isClick({ x: 1, y: 1 })).toBe(true);
    // Past half a minor cell the press is a drag.
    expect(isClick({ x: DEFAULT_GRID / 2 + 1, y: 0 })).toBe(false);
  });

  test('with snap off a move follows the pointer', ({ expect }) => {
    const { moveDelta } = sceneSnap(DEFAULT_GRID, ZOOM, false);
    expect(moveDelta({ x: MAJOR_GRID, y: MAJOR_GRID }, { x: 37, y: 23 })).toEqual({ x: 37, y: 23 });
  });
});
