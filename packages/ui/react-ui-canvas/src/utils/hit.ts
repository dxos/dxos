//
// Copyright 2026 DXOS.org
//

//
// Hit testing from the model in scene coordinates, never from `getClientRects`, so it is pure and the
// same for every renderer.
//

import { type Bounds, MAJOR_GRID, type Node, type Point, type Scene } from '../model/types.ts';
import { sortByZ } from './order.ts';
import { nodeBounds } from './shapes.ts';

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
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const bounds of list) {
    minX = Math.min(minX, bounds.x);
    minY = Math.min(minY, bounds.y);
    maxX = Math.max(maxX, bounds.x + bounds.width);
    maxY = Math.max(maxY, bounds.y + bounds.height);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
};

export const padBounds = (bounds: Bounds, padding: number): Bounds => ({
  x: bounds.x - padding,
  y: bounds.y - padding,
  width: bounds.width + 2 * padding,
  height: bounds.height + 2 * padding,
});

export const boundsFromPoints = (from: Point, to: Point): Bounds => ({
  x: Math.min(from.x, to.x),
  y: Math.min(from.y, to.y),
  width: Math.abs(to.x - from.x),
  height: Math.abs(to.y - from.y),
});

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

export const nodeList = (scene: Scene): Node[] => Object.values(scene.nodes);

/**
 * Derived scene bounds (decision 6): the union of nodes plus padding, grown to the major grid so the
 * frame sits on grid lines; an empty scene gets a default extent so a portal to it still has
 * something to map.
 */
export const sceneBounds = (scene: Scene, padding = BOUNDS_PADDING, unit = MAJOR_GRID): Bounds => {
  const union = unionBounds(nodeList(scene).map(nodeBounds));
  return union ? alignBounds(padBounds(union, padding), unit) : DEFAULT_EXTENT;
};

/** Topmost node under `point`, or none; `margin` widens every node, e.g. to reach its ports. */
export const hitTest = (scene: Scene, point: Point, margin = 0): Node | undefined => {
  const nodes = sortByZ(nodeList(scene));
  for (let index = nodes.length - 1; index >= 0; index--) {
    if (containsPoint(padBounds(nodeBounds(nodes[index]), margin), point)) {
      return nodes[index];
    }
  }
  return undefined;
};

/** Nodes whose bounds intersect `bounds` (marquee semantics). */
export const nodesIntersecting = (scene: Scene, bounds: Bounds): Node[] =>
  nodeList(scene).filter((node) => intersects(nodeBounds(node), bounds));
