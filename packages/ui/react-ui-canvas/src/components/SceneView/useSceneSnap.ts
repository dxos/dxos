//
// Copyright 2026 DXOS.org
//

import { useCallback, useMemo } from 'react';

import { MAJOR_GRID_RATIO } from '../../model/types.ts';

/**
 * Grid levels a fourfold apart, from a quarter of the minor grid to far past the major one, so the levels
 * on screen depend on the zoom alone: a child scene seen at a quarter scale draws the same lines as its
 * parent, and a far zoom-out still shows a grid.
 */
export const GRID_LEVELS = [1 / MAJOR_GRID_RATIO, 1, MAJOR_GRID_RATIO, MAJOR_GRID_RATIO ** 2, MAJOR_GRID_RATIO ** 3];

/** Screen px a cell must cover to be drawn, and the most lines a level may draw before it is dropped. */
export const GRID_RANGE: [number, number] = [6, 2048];

export type SceneSnap = {
  /** The finest level drawn, in scene units; moves and control points land on it. */
  minor: number;
  /** `MAJOR_GRID_RATIO` of those; creation and resizing land on it. */
  major: number;
  snap: (value: number) => number;
  snapMinor: (value: number) => number;
};

/**
 * What a gesture lands on: the grid levels actually drawn, which is what the user is aiming at. A level
 * fixed in scene units parts company with the lines as soon as the zoom moves — `Grid` keeps a level only
 * while its cells are legible on screen, so far enough in the drawn lines are finer than the snap and far
 * enough out (a nested scene, entered at a fraction of the parent's zoom) they are coarser and the snap
 * stops landing on anything visible. Reading the level back from the same rule keeps the two the same by
 * construction.
 */
export const useSceneSnap = (grid: number, zoom: number, enabled: boolean): SceneSnap => {
  const minor = useMemo(() => {
    const levels = GRID_LEVELS.map((ratio) => ratio * grid);
    return levels.find((size) => size * zoom >= GRID_RANGE[0]) ?? levels[levels.length - 1];
  }, [grid, zoom]);
  const major = minor * MAJOR_GRID_RATIO;

  const snap = useCallback((value: number) => (enabled ? Math.round(value / major) * major : value), [enabled, major]);
  // Moving is finer than creating or resizing: a placed node keeps its major-grid size and edges land on
  // minor lines, so ports (drawn at the nearest major line) stay aligned while placement is not coarse.
  const snapMinor = useCallback(
    (value: number) => (enabled ? Math.round(value / minor) * minor : value),
    [enabled, minor],
  );

  return { minor, major, snap, snapMinor };
};
