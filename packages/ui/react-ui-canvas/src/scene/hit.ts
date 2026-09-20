//
// Copyright 2026 DXOS.org
//

//
// Hit testing from the model in scene coordinates, never from `getClientRects`, so it is pure and the
// same for every renderer.
//

import { cellBounds } from './camera.ts';
import { sortByZ } from './order.ts';
import { type Bounds, MAJOR_GRID, type PlacedCell, type Point, type Scene, isPlaced } from './types.ts';

export const DEFAULT_EXTENT: Bounds = { x: 0, y: 0, width: 1600, height: 1024 };
export const BOUNDS_PADDING = MAJOR_GRID;

export const containsPoint = (bounds: Bounds, point: Point) =>
  point.x >= bounds.x &&
  point.x <= bounds.x + bounds.width &&
  point.y >= bounds.y &&
  point.y <= bounds.y + bounds.height;

export const intersects = (left: Bounds, right: Bounds) =>
  left.x < right.x + right.width &&
  left.x + left.width > right.x &&
  left.y < right.y + right.height &&
  left.y + left.height > right.y;

export const unionBounds = (list: readonly Bounds[]): Bounds | undefined => {
  if (list.length === 0) {
    return undefined;
  }
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const bounds of list) {
    x0 = Math.min(x0, bounds.x);
    y0 = Math.min(y0, bounds.y);
    x1 = Math.max(x1, bounds.x + bounds.width);
    y1 = Math.max(y1, bounds.y + bounds.height);
  }
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
};

export const padBounds = (bounds: Bounds, padding: number): Bounds => ({
  x: bounds.x - padding,
  y: bounds.y - padding,
  width: bounds.width + 2 * padding,
  height: bounds.height + 2 * padding,
});

/** Normalise a drag rectangle given by two corners. */
export const boundsFromPoints = (from: Point, to: Point): Bounds => ({
  x: Math.min(from.x, to.x),
  y: Math.min(from.y, to.y),
  width: Math.abs(to.x - from.x),
  height: Math.abs(to.y - from.y),
});

export const placedCells = (scene: Scene): PlacedCell[] => Object.values(scene.cells).filter(isPlaced);

/** Grow `bounds` outward to the nearest multiples of `unit`. */
export const alignBounds = (bounds: Bounds, unit: number): Bounds => {
  const x = Math.floor(bounds.x / unit) * unit;
  const y = Math.floor(bounds.y / unit) * unit;
  return {
    x,
    y,
    width: Math.ceil((bounds.x + bounds.width) / unit) * unit - x,
    height: Math.ceil((bounds.y + bounds.height) / unit) * unit - y,
  };
};

/**
 * Derived scene bounds (decision 6): the union of placed cells plus padding, grown to the major grid so
 * the frame sits on grid lines; an empty scene gets a default extent so a portal to it still has
 * something to map.
 */
export const sceneBounds = (scene: Scene, padding = BOUNDS_PADDING, unit = MAJOR_GRID): Bounds => {
  const union = unionBounds(placedCells(scene).map(cellBounds));
  return union ? alignBounds(padBounds(union, padding), unit) : DEFAULT_EXTENT;
};

/** Topmost placed cell under `point`, or none; `margin` widens every cell, e.g. to reach its ports. */
export const hitTest = (scene: Scene, point: Point, margin = 0): PlacedCell | undefined => {
  const cells = sortByZ(placedCells(scene));
  for (let index = cells.length - 1; index >= 0; index--) {
    if (containsPoint(padBounds(cellBounds(cells[index]), margin), point)) {
      return cells[index];
    }
  }
  return undefined;
};

/** Placed cells whose bounds intersect `bounds` (marquee semantics). */
export const cellsIntersecting = (scene: Scene, bounds: Bounds): PlacedCell[] =>
  placedCells(scene).filter((cell) => intersects(cellBounds(cell), bounds));
