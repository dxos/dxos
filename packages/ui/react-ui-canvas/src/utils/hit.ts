//
// Copyright 2026 DXOS.org
//

//
// Hit testing from the model in scene coordinates, never from `getClientRects`, so it is pure and the
// same for every renderer.
//

import { type Bounds, MAJOR_GRID, type Node, type Point } from '@dxos/scene';

import { type RenderList2D } from '../model/index.ts';
import { sortByZ } from './order.ts';
import { nodeBounds } from './shapes.ts';

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

export const nodeList = (scene: RenderList2D): Node[] => Object.values(scene.nodes);

/**
 * What a scene holds (decision 6): the union of its nodes plus padding, grown to the major grid. Fit and a
 * portal's preview frame it; an empty scene has none.
 */
export const contentBounds = (scene: RenderList2D, padding = BOUNDS_PADDING, unit = MAJOR_GRID): Bounds | undefined => {
  const content = unionBounds(nodeList(scene).map(nodeBounds));
  return content ? alignBounds(padBounds(content, padding), unit) : undefined;
};

/** `point` turned back by the node's rotation about its centre, into the frame's own axes. */
export const unrotatePoint = (node: Node, point: Point): Point => {
  const rotation = node.rotation ?? 0;
  if (rotation === 0) {
    return point;
  }
  const angle = (-rotation * Math.PI) / 180;
  const dx = point.x - node.center.x;
  const dy = point.y - node.center.y;
  return {
    x: node.center.x + dx * Math.cos(angle) - dy * Math.sin(angle),
    y: node.center.y + dx * Math.sin(angle) + dy * Math.cos(angle),
  };
};

/** Topmost node under `point`, or none; `margin` widens every node, e.g. to reach its ports. */
export const hitTest = (scene: RenderList2D, point: Point, margin = 0): Node | undefined => {
  const nodes = sortByZ(nodeList(scene));
  for (let index = nodes.length - 1; index >= 0; index--) {
    if (containsPoint(padBounds(nodeBounds(nodes[index]), margin), unrotatePoint(nodes[index], point))) {
      return nodes[index];
    }
  }
  return undefined;
};

/** Nodes whose bounds intersect `bounds` (marquee semantics). */
export const nodesIntersecting = (scene: RenderList2D, bounds: Bounds): Node[] =>
  nodeList(scene).filter((node) => intersects(nodeBounds(node), bounds));
