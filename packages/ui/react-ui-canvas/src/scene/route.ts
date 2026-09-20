//
// Copyright 2026 DXOS.org
//

//
// Link routes as SVG path data in scene coordinates. `curve` leaves each port along its side's normal
// and bends toward the other end; `ortho` (phase 2) will come from `@dxos/diagram`'s router.
//

import { sideNormal } from './ports.ts';
import { type Point, type Side } from './types.ts';

const MIN_TANGENT = 40;
const TANGENT_RATIO = 0.4;

export type RouteEnd = { point: Point; side: Side };

/** Cubic Bézier whose control points sit `tangent` px out along each port's normal. */
export const curvePath = (from: RouteEnd, to: RouteEnd): string => {
  const dx = to.point.x - from.point.x;
  const dy = to.point.y - from.point.y;
  const tangent = Math.max(MIN_TANGENT, Math.hypot(dx, dy) * TANGENT_RATIO);
  const fromNormal = sideNormal(from.side);
  const toNormal = sideNormal(to.side);
  const control1 = { x: from.point.x + fromNormal.x * tangent, y: from.point.y + fromNormal.y * tangent };
  const control2 = { x: to.point.x + toNormal.x * tangent, y: to.point.y + toNormal.y * tangent };
  return `M ${from.point.x} ${from.point.y} C ${control1.x} ${control1.y}, ${control2.x} ${control2.y}, ${to.point.x} ${to.point.y}`;
};

/** Point on the cubic at parameter `t`, for placing a label at the midpoint. */
export const curvePoint = (from: RouteEnd, to: RouteEnd, t: number): Point => {
  const dx = to.point.x - from.point.x;
  const dy = to.point.y - from.point.y;
  const tangent = Math.max(MIN_TANGENT, Math.hypot(dx, dy) * TANGENT_RATIO);
  const fromNormal = sideNormal(from.side);
  const toNormal = sideNormal(to.side);
  const p0 = from.point;
  const p1 = { x: from.point.x + fromNormal.x * tangent, y: from.point.y + fromNormal.y * tangent };
  const p2 = { x: to.point.x + toNormal.x * tangent, y: to.point.y + toNormal.y * tangent };
  const p3 = to.point;
  const u = 1 - t;
  return {
    x: u ** 3 * p0.x + 3 * u ** 2 * t * p1.x + 3 * u * t ** 2 * p2.x + t ** 3 * p3.x,
    y: u ** 3 * p0.y + 3 * u ** 2 * t * p1.y + 3 * u * t ** 2 * p2.y + t ** 3 * p3.y,
  };
};
