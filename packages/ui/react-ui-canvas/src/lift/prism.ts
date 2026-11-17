//
// Copyright 2026 DXOS.org
//

//
// A 2D outline stood up as a solid: the prism a `mesh` element draws, in the unit cube every 3D kind is sized from,
// so the placing element's `scale` gives it its footprint and its thickness.
//

import { type Point } from '@dxos/scene';

/** Unit-sized triangles centred on the origin, as a `mesh` object stores them. */
export type PrismMesh = { key: string; positions: number[]; indices: number[] };

/** Twice the signed area of the polygon: positive where it runs counter-clockwise with y up. */
const area2 = (points: readonly Point[]): number =>
  points.reduce((sum, { x, y }, index) => {
    const next = points[(index + 1) % points.length];
    return sum + x * next.y - next.x * y;
  }, 0);

const cross = (origin: Point, left: Point, right: Point): number =>
  (left.x - origin.x) * (right.y - origin.y) - (left.y - origin.y) * (right.x - origin.x);

/** Whether `point` is inside the triangle, its edges included. */
const inside = (point: Point, [first, second, third]: readonly [Point, Point, Point]): boolean => {
  const signs = [cross(first, second, point), cross(second, third, point), cross(third, first, point)];
  return signs.every((sign) => sign >= 0) || signs.every((sign) => sign <= 0);
};

/**
 * A simple polygon cut into triangles by clipping ears, as index triples into `points`, each wound as the polygon is.
 * A polygon that crosses itself is cut as far as ears are found.
 */
export const triangulate = (points: readonly Point[]): number[] => {
  const turn = Math.sign(area2(points)) || 1;
  const ring = points.map((_, index) => index);
  const triangles: number[] = [];
  while (ring.length > 3) {
    const ear = ring.findIndex((vertex, at) => {
      const before = ring[(at + ring.length - 1) % ring.length];
      const after = ring[(at + 1) % ring.length];
      const corner: [Point, Point, Point] = [points[before], points[vertex], points[after]];
      // A corner turning the polygon's way, with no other vertex inside it, can be cut off.
      return (
        cross(...corner) * turn > 0 &&
        !ring.some((other) => other !== before && other !== vertex && other !== after && inside(points[other], corner))
      );
    });
    if (ear < 0) {
      break;
    }
    triangles.push(ring[(ear + ring.length - 1) % ring.length], ring[ear], ring[(ear + 1) % ring.length]);
    ring.splice(ear, 1);
  }
  return ring.length === 3 ? [...triangles, ...ring] : triangles;
};

const EPSILON = 1e-9;

/**
 * The outline as a ring fit to cut: without a vertex that repeats the one before it (the first after the last too),
 * and without one on the line between its neighbours. A recipe fitted to a small frame gives both, and neither is a
 * corner an ear could be cut at; the outline drawn is the same.
 */
const ring = (points: readonly Point[]): Point[] => {
  const kept = [...points];
  // One vertex at a time: taking two neighbours out in one pass could take a corner with them.
  while (kept.length >= 3) {
    const spare = kept.findIndex((point, index) => {
      const before = kept[(index + kept.length - 1) % kept.length];
      const after = kept[(index + 1) % kept.length];
      return (
        Math.hypot(point.x - before.x, point.y - before.y) <= EPSILON ||
        Math.abs(cross(before, point, after)) <= EPSILON
      );
    });
    if (spare < 0) {
      break;
    }
    kept.splice(spare, 1);
  }
  return kept;
};

const round = (value: number) => Math.round(value * 1e6) / 1e6 + 0;

/** FNV-1a over the numbers, so two prisms of one outline share a key and a cached mesh. */
const contentKey = (positions: readonly number[], indices: readonly number[]): string => {
  let hash = 0x811c9dc5;
  for (const value of [...positions, ...indices]) {
    hash ^= Math.round(value * 1e6) | 0;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `prism-${positions.length / 3}-${indices.length / 3}-${hash.toString(16)}`;
};

/**
 * The prism over an outline given in a frame's unit space (0..1, origin top-left, y down, as the canvas has it): the
 * outline stood on the ground plane (canvas y is −z) and as thick as the unit cube, its faces wound outward.
 */
export const prismMesh = (outline: readonly Point[]): PrismMesh | undefined => {
  // Each vertex on the ground plane: the scene's x, and its z, which runs against the canvas's y.
  const ground = ring(outline.map(({ x, y }) => ({ x: x - 0.5, y: 0.5 - y })));
  if (ground.length < 3) {
    return undefined;
  }
  const count = ground.length;
  const caps = triangulate(ground);
  // A cap cut only part of the way would leave the solid open.
  if (caps.length !== (count - 2) * 3) {
    return undefined;
  }
  // The top ring, then the bottom ring.
  const positions = [0.5, -0.5].flatMap((height) => ground.flatMap(({ x, y }) => [round(x), height, round(y)]));
  // A face is wound counter-clockwise seen from outside; on the ground's x and z that is clockwise for the top.
  const turns = area2(ground) > 0;
  const indices: number[] = [];
  for (let corner = 0; corner < caps.length; corner += 3) {
    const [first, second, third] = [caps[corner], caps[corner + 1], caps[corner + 2]];
    indices.push(...(turns ? [first, third, second] : [first, second, third]));
    indices.push(
      ...(turns ? [count + first, count + second, count + third] : [count + first, count + third, count + second]),
    );
  }
  for (let index = 0; index < count; index++) {
    const next = (index + 1) % count;
    const [top, topNext, bottom, bottomNext] = [index, next, count + index, count + next];
    indices.push(
      ...(turns
        ? [top, topNext, bottomNext, top, bottomNext, bottom]
        : [top, bottomNext, topNext, top, bottom, bottomNext]),
    );
  }
  return { key: contentKey(positions, indices), positions, indices };
};
