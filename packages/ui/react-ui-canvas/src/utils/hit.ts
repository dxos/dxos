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

/**
 * Centred on the origin, not anchored at it: a scene is laid out around (0, 0), so an extent running
 * from the origin to (1600, 1024) puts its own centre well below and right of the content and the
 * initial fit — which centres the frame — pushes everything into the top-left corner. Each half is a
 * whole number of major cells, so the frame still lands on grid lines.
 */
export const DEFAULT_EXTENT: Bounds = { x: -832, y: -512, width: 1664, height: 1024 };
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
 * frame sits on grid lines. The default extent is a floor rather than a fallback for an empty scene:
 * content only ever grows the frame, so drawing the first node does not collapse the scene around it.
 *
 * This is the frame of a scene shown on its own — the surface the user edits on. A scene shown through
 * a portal is framed by {@link contentBounds} instead.
 */
export const sceneBounds = (scene: Scene, padding = BOUNDS_PADDING, unit = MAJOR_GRID): Bounds => {
  const content = unionBounds(nodeList(scene).map(nodeBounds));
  const union = unionBounds(content ? [DEFAULT_EXTENT, padBounds(content, padding)] : [DEFAULT_EXTENT]);
  return alignBounds(union ?? DEFAULT_EXTENT, unit);
};

/**
 * What a scene is worth showing: the same frame without the floor under it, so a child drawn in a portal
 * fills its tile rather than being shrunk to fit an editing surface it is not being edited on. An empty
 * scene has no content to frame, so there the floor is the frame.
 */
export const contentBounds = (scene: Scene, padding = BOUNDS_PADDING, unit = MAJOR_GRID): Bounds => {
  const content = unionBounds(nodeList(scene).map(nodeBounds));
  return content ? alignBounds(padBounds(content, padding), unit) : alignBounds(DEFAULT_EXTENT, unit);
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
