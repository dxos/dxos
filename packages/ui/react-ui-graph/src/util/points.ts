//
// Copyright 2022 DXOS.org
//

import { type Point } from './types';

/**
 * Creates an array of points on the the circumference of two circles.
 * http://www.math.com/tables/geometry/circles.htm
 *
 * @param p1
 * @param p2
 * @param r1
 * @param r2
 * @return {[Point, Point]}
 */
export const getCircumferencePoints = (p1: Point, p2: Point, r1 = 0, r2 = 0): [Point, Point] => {
  const [x1, y1] = p1;
  const [x2, y2] = p2;

  const theta = Math.atan2(x2 - x1, y2 - y1);

  return [
    [
      // p1
      x1 + (r1 === 0 ? 0 : r1 * Math.sin(theta)),
      y1 + (r1 === 0 ? 0 : r1 * Math.cos(theta)),
    ],
    [
      // p2
      x2 - (r2 === 0 ? 0 : r2 * Math.cos(Math.PI / 2 - theta)),
      y2 - (r2 === 0 ? 0 : r2 * Math.sin(Math.PI / 2 - theta)),
    ],
  ];
};

// Compute unit normal for a line segment.
export const normal = (p1: Point, p2: Point): Point => {
  const dx = p2[0] - p1[0];
  const dy = p2[1] - p1[1];
  const len = Math.hypot(dx, dy);
  return [dy / len, -dx / len]; // rotated +90°
};

// Average adjacent normals.
export const offsetPoints = (points: Point[], distance: number, closed: boolean): Point[] => {
  const len = points.length;
  const out: Point[] = [];

  for (let i = 0; i < len; i++) {
    const p0 = points[(i - 1 + len) % len];
    const p1 = points[i];
    const p2 = points[(i + 1) % len];

    const n1 = normal(p0, p1);
    const n2 = normal(p1, p2);
    const nx = (n1[0] + n2[0]) / 2;
    const ny = (n1[1] + n2[1]) / 2;
    const norm = Math.hypot(nx, ny) || 1;
    out.push([p1[0] + (distance * nx) / norm, p1[1] + (distance * ny) / norm]);

    if (!closed && (i === 0 || i === len - 1)) {
      out[i] = [p1[0] + distance * normal(p0, p1)[0], p1[1] + distance * normal(p0, p1)[1]];
    }
  }

  return out;
};
