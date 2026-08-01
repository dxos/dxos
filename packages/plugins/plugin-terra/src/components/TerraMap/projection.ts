//
// Copyright 2026 DXOS.org
//

import { type Vec3 } from '../../engine';
import { angleBetween, slerp, toGeo } from '../../sim';

/**
 * Equirectangular map units: one unit is one degree, with the origin at 180°W/90°N. Using degrees
 * as the SVG user space means projection is the whole transform — no separate pixel scaling — and
 * the view scales by `viewBox` alone.
 */
export const MAP_WIDTH = 360;
export const MAP_HEIGHT = 180;

export type Point = { x: number; y: number };

/** Projects a unit-sphere point onto the map (plate carrée). */
export const project = (unit: Vec3): Point => {
  const { lat, lng } = toGeo(unit);
  return { x: lng + 180, y: 90 - lat };
};

/**
 * Splits a projected path into segments that never wrap: a great-circle leg whose ends straddle the
 * antimeridian is adjacent on the globe but a full map width apart here, and drawn as one polyline
 * it would streak back across everything between. Each crossing is closed off at the map edge and
 * reopened on the other side, at the latitude the path crosses at, so the line stays continuous.
 */
export const splitPath = (points: readonly Point[]): Point[][] => {
  if (points.length === 0) {
    return [];
  }

  const segments: Point[][] = [];
  let current: Point[] = [points[0]];
  for (let index = 1; index < points.length; index++) {
    const previous = points[index - 1];
    const point = points[index];
    if (Math.abs(point.x - previous.x) > MAP_WIDTH / 2) {
      // Eastward when the shorter way round runs off the right edge and returns on the left.
      const eastward = point.x < previous.x;
      const run = eastward ? MAP_WIDTH - previous.x + point.x : previous.x + (MAP_WIDTH - point.x);
      const fraction = run === 0 ? 0 : (eastward ? MAP_WIDTH - previous.x : previous.x) / run;
      const y = previous.y + (point.y - previous.y) * fraction;
      current.push({ x: eastward ? MAP_WIDTH : 0, y });
      segments.push(current);
      current = [{ x: eastward ? 0 : MAP_WIDTH, y }];
    }
    current.push(point);
  }

  segments.push(current);
  return segments.filter((segment) => segment.length > 1);
};

/** Longest great-circle step, in degrees, drawn as a single straight line on the map. */
const SUBDIVISION_STEP = 3;

/**
 * Samples a route's great-circle legs at `SUBDIVISION_STEP`, since a geodesic is a curve in this
 * projection, not a straight line — drawn end to end, a long leg would visibly cut across terrain
 * the route was planned around (badly so at high latitudes, where a straight line on the map is
 * nothing like the shortest path).
 */
const subdivide = (path: readonly Vec3[]): Vec3[] => {
  if (path.length < 2) {
    return [...path];
  }

  const points: Vec3[] = [path[0]];
  for (let index = 1; index < path.length; index++) {
    const from = path[index - 1];
    const to = path[index];
    const steps = Math.max(1, Math.ceil((angleBetween(from, to) * 180) / Math.PI / SUBDIVISION_STEP));
    for (let step = 1; step <= steps; step++) {
      points.push(slerp(from, to, step / steps));
    }
  }

  return points;
};

/** A projected path as SVG polyline point lists, one per non-wrapping segment. */
export const projectPath = (path: readonly Vec3[]): string[] =>
  splitPath(subdivide(path).map(project)).map((segment) =>
    segment.map(({ x, y }) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' '),
  );
