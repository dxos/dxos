//
// Copyright 2026 DXOS.org
//

//
// Link routes as SVG path data in scene coordinates, one per link type: `line` is straight, `curve`
// leaves each port along its side's normal and bends toward the other end, `spline` passes through the
// link's control points (Catmull-Rom, emitted as cubic segments). `ortho` (phase 2) will come from
// `@dxos/diagram`'s router.
//

import { sideNormal } from './ports.ts';
import { type Link, type Point, type Side } from './types.ts';

const MIN_TANGENT = 40;
const TANGENT_RATIO = 0.4;

export type RouteEnd = { point: Point; side: Side };

const pt = ({ x, y }: Point) => `${x} ${y}`;

export const linePath = (from: Point, to: Point): string => `M ${pt(from)} L ${pt(to)}`;

const curveControls = (from: RouteEnd, to: RouteEnd): [Point, Point] => {
  const dx = to.point.x - from.point.x;
  const dy = to.point.y - from.point.y;
  const tangent = Math.max(MIN_TANGENT, Math.hypot(dx, dy) * TANGENT_RATIO);
  const fromNormal = sideNormal(from.side);
  const toNormal = sideNormal(to.side);
  return [
    { x: from.point.x + fromNormal.x * tangent, y: from.point.y + fromNormal.y * tangent },
    { x: to.point.x + toNormal.x * tangent, y: to.point.y + toNormal.y * tangent },
  ];
};

/** Cubic Bézier whose control points sit `tangent` px out along each port's normal. */
export const curvePath = (from: RouteEnd, to: RouteEnd): string => {
  const [control1, control2] = curveControls(from, to);
  return `M ${pt(from.point)} C ${pt(control1)}, ${pt(control2)}, ${pt(to.point)}`;
};

/** Point on the curve at parameter `t`, for placing a label at the midpoint. */
export const curvePoint = (from: RouteEnd, to: RouteEnd, t: number): Point => {
  const [p1, p2] = curveControls(from, to);
  const p0 = from.point;
  const p3 = to.point;
  const u = 1 - t;
  return {
    x: u ** 3 * p0.x + 3 * u ** 2 * t * p1.x + 3 * u * t ** 2 * p2.x + t ** 3 * p3.x,
    y: u ** 3 * p0.y + 3 * u ** 2 * t * p1.y + 3 * u * t ** 2 * p2.y + t ** 3 * p3.y,
  };
};

/**
 * Centripetal-style Catmull-Rom through every point, as cubic segments (the standard conversion with
 * tension 1/6); two points degrade to a line.
 */
export const splinePath = (points: readonly Point[]): string => {
  if (points.length < 2) {
    return '';
  }
  if (points.length === 2) {
    return linePath(points[0], points[1]);
  }
  const segments: string[] = [`M ${pt(points[0])}`];
  for (let index = 0; index < points.length - 1; index++) {
    const p0 = points[Math.max(index - 1, 0)];
    const p1 = points[index];
    const p2 = points[index + 1];
    const p3 = points[Math.min(index + 2, points.length - 1)];
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    segments.push(`C ${pt(c1)}, ${pt(c2)}, ${pt(p2)}`);
  }
  return segments.join(' ');
};

/** The path of a link between two resolved ends, by its type. */
export const linkPath = (link: Link, from: RouteEnd, to: RouteEnd): string => {
  switch (link.type) {
    case 'line':
      return linePath(from.point, to.point);
    case 'curve':
      return curvePath(from, to);
    case 'spline':
      return splinePath([from.point, ...link.points, to.point]);
  }
};

/** Index at which a new control point at `point` keeps the polyline `ends`+`points` in order. */
export const insertIndex = (from: Point, points: readonly Point[], to: Point, point: Point): number => {
  const polyline = [from, ...points, to];
  let best = 0;
  let bestDistance = Infinity;
  for (let index = 0; index < polyline.length - 1; index++) {
    const distance = segmentDistance(polyline[index], polyline[index + 1], point);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = index;
    }
  }
  return best;
};

const segmentDistance = (a: Point, b: Point, p: Point): number => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length2 = dx * dx + dy * dy;
  const t = length2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length2));
  return Math.hypot(a.x + t * dx - p.x, a.y + t * dy - p.y);
};
