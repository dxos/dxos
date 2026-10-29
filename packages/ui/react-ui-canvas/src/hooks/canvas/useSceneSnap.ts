//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import { MAJOR_GRID_RATIO, type Point } from '../../model/index.ts';

/**
 * Grid levels a fourfold apart, from a quarter of the minor grid to far past the major one, so the levels
 * on screen depend on the zoom alone: a child scene seen at a quarter scale draws the same lines as its
 * parent, and a far zoom-out still shows a grid.
 */
export const GRID_LEVELS = [1 / MAJOR_GRID_RATIO, 1, MAJOR_GRID_RATIO, MAJOR_GRID_RATIO ** 2, MAJOR_GRID_RATIO ** 3];

/** Screen px a cell must cover to be drawn, and the most lines a level may draw before it is dropped. */
export const GRID_RANGE: [number, number] = [6, 2048];

export type SceneSnap = {
  /** The finest level drawn, in scene units; control points land on it. */
  minor: number;
  /** `MAJOR_GRID_RATIO` of those; moves, resizes and creation land on it. */
  major: number;
  snap: (value: number) => number;
  snapMinor: (value: number) => number;
  /** A press that has moved less than half a minor cell with snap on: a click, which moves and resizes nothing. */
  isClick: (offset: Point) => boolean;
  /** The offset a move applies, so the pressed node's top-left (`anchor`) lands on the major grid. */
  moveDelta: (anchor: Point, offset: Point) => Point;
};

/**
 * What a gesture lands on: the grid levels actually drawn, which is what the user is aiming at. A level
 * fixed in scene units parts company with the lines as soon as the zoom moves - `Grid` keeps a level only
 * while its cells are legible on screen, so far enough in the drawn lines are finer than the snap and far
 * enough out (a nested scene, entered at a fraction of the parent's zoom) they are coarser and the snap
 * stops landing on anything visible. Reading the level back from the same rule keeps the two the same by
 * construction.
 */
const minorLevel = (grid: number, zoom: number): number => {
  const levels = GRID_LEVELS.map((ratio) => ratio * grid);
  return levels.find((size) => size * zoom >= GRID_RANGE[0]) ?? levels[levels.length - 1];
};

const snapOn = (minor: number, enabled: boolean): SceneSnap => {
  const major = minor * MAJOR_GRID_RATIO;
  const snap = (value: number) => (enabled ? Math.round(value / major) * major : value);
  // A link's control point is finer than a node: a bend need not sit on a major line.
  const snapMinor = (value: number) => (enabled ? Math.round(value / minor) * minor : value);
  // A node off the major grid (a palette drop sits on the minor one) would otherwise jump up to half a major
  // cell on a click's jitter, so a press that has not left half a minor cell does not snap.
  const isClick = (offset: Point) => enabled && Math.hypot(offset.x, offset.y) < minor / 2;
  const moveDelta = (anchor: Point, offset: Point): Point =>
    isClick(offset)
      ? { x: 0, y: 0 }
      : { x: snap(anchor.x + offset.x) - anchor.x, y: snap(anchor.y + offset.y) - anchor.y };
  return { minor, major, snap, snapMinor, isClick, moveDelta };
};

/** The snap for a view's grid, zoom and snap toggle. */
export const sceneSnap = (grid: number, zoom: number, enabled: boolean): SceneSnap =>
  snapOn(minorLevel(grid, zoom), enabled);

/** `sceneSnap`, stable while the drawn level and the toggle hold, however the zoom moves within the level. */
export const useSceneSnap = (grid: number, zoom: number, enabled: boolean): SceneSnap => {
  const minor = minorLevel(grid, zoom);
  return useMemo(() => snapOn(minor, enabled), [minor, enabled]);
};
