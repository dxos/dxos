//
// Copyright 2026 DXOS.org
//

import { type PolygonFit, type Size } from '../model/index.ts';

/** Bumps around a cloud's outline when the node sets none. */
export const DEFAULT_CLOUD_BUMPS = 9;

/** Sides of a polygon when the node sets none. */
export const DEFAULT_POLYGON_SIDES = 6;

/** How far a bump stands out from the cloud's body, as a share of the frame's shorter half. */
const BULGE = 0.32;

const round = (value: number) => Math.round(value * 100) / 100;

/** `count` points on the ellipse of radii `radiusX`, `radiusY` centred in a frame of `size`, the first on top. */
const ring = ({ width, height }: Size, radiusX: number, radiusY: number, count: number, offset = 0) =>
  Array.from({ length: count }, (_, index) => {
    const angle = -Math.PI / 2 + ((index + offset) * 2 * Math.PI) / count;
    return { x: width / 2 + radiusX * Math.cos(angle), y: height / 2 + radiusY * Math.sin(angle) };
  });

/**
 * SVG path data for a cloud filling a frame of `size` (its own px, origin top-left), kept `inset` px inside the frame
 * so a stroke twice that wide stays within it: a ring of `bumps` arcs, alternately larger and smaller, bulging out
 * from an ellipse inscribed in the frame.
 */
export const cloudPath = (size: Size, inset = 0, bumps = DEFAULT_CLOUD_BUMPS): string => {
  const count = Math.max(3, Math.round(bumps));
  const outerX = Math.max(0, size.width / 2 - inset);
  const outerY = Math.max(0, size.height / 2 - inset);
  const bulge = Math.min(outerX, outerY) * BULGE;
  // Rotated half a step so a bump, not a dip, crowns the top.
  const points = ring(size, outerX - bulge, outerY - bulge, count, 0.5);
  const arcs = points.map((from, index) => {
    const to = points[(index + 1) % count];
    const chord = Math.hypot(to.x - from.x, to.y - from.y);
    // The sagitta: how far the arc stands off its chord; an odd count ends on a large bump beside the first.
    const sagitta = bulge * (index % 2 === 0 ? 1 : 0.75);
    const radius = (chord * chord) / 4 / (2 * sagitta) + sagitta / 2;
    const large = sagitta > chord / 2 ? 1 : 0;
    return `A ${round(radius)} ${round(radius)} 0 ${large} 1 ${round(to.x)} ${round(to.y)}`;
  });
  return `M ${round(points[0].x)} ${round(points[0].y)} ${arcs.join(' ')} Z`;
};

export type PolygonPathOptions = {
  /** Px kept inside the frame, so a stroke twice that wide stays within it. */
  inset?: number;
  sides?: number;
  /** Px each corner is rounded by, no larger than half of either edge allows. */
  radius?: number;
  fit?: PolygonFit;
};

/**
 * SVG path data for a regular polygon, a vertex on top, in a frame of `size`: with `fit: 'frame'` as large as fits the
 * frame and centred by its own bounds (an odd polygon is lower on top than across its base); with `fit: 'circle'` its
 * vertices on the circle that fits the frame, centred on it.
 */
export const polygonPath = (
  size: Size,
  { inset = 0, sides = DEFAULT_POLYGON_SIDES, radius = 0, fit = 'frame' }: PolygonPathOptions = {},
): string => {
  const count = Math.max(3, Math.round(sides));
  const unit = ring({ width: 0, height: 0 }, 1, 1, count);
  const xs = unit.map(({ x }) => x);
  const ys = unit.map(({ y }) => y);
  const [left, right, top, bottom] =
    fit === 'circle' ? [-1, 1, -1, 1] : [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  // A sharp corner's mitred stroke reaches `inset / sin(theta/2)` past its vertex (theta the interior angle), so on a circle the
  // vertices are pulled in by that much for the tips to stay on it; a rounded corner's stroke reaches only `inset`.
  const halfAngle = (Math.PI - (2 * Math.PI) / count) / 2;
  const reach = fit === 'circle' && radius <= 0 ? inset / Math.sin(halfAngle) : inset;
  // Uniform, so the polygon stays regular in a frame of any aspect.
  const scale = Math.max(
    0,
    Math.min((size.width - 2 * reach) / (right - left), (size.height - 2 * reach) / (bottom - top)),
  );
  const dx = size.width / 2 - ((left + right) / 2) * scale;
  const dy = size.height / 2 - ((top + bottom) / 2) * scale;
  const points = unit.map(({ x, y }) => ({ x: dx + x * scale, y: dy + y * scale }));
  if (radius <= 0 || scale === 0) {
    return `M ${points.map(({ x, y }) => `${round(x)} ${round(y)}`).join(' L ')} Z`;
  }
  // A corner of interior angle theta, rounded by radius r, starts r / tan(theta/2) back along each edge.
  const edge = Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y);
  const back = Math.min(radius / Math.tan(halfAngle), edge / 2);
  const arc = back * Math.tan(halfAngle);
  const toward = (from: { x: number; y: number }, to: { x: number; y: number }) => ({
    x: from.x + ((to.x - from.x) * back) / edge,
    y: from.y + ((to.y - from.y) * back) / edge,
  });
  const corners = points.map((point, index) => ({
    start: toward(point, points[(index + count - 1) % count]),
    end: toward(point, points[(index + 1) % count]),
  }));
  const segments = corners.map(
    ({ start, end }) =>
      `L ${round(start.x)} ${round(start.y)} A ${round(arc)} ${round(arc)} 0 0 1 ${round(end.x)} ${round(end.y)}`,
  );
  const { end: first } = corners[0];
  return `M ${round(first.x)} ${round(first.y)} ${[...segments.slice(1), segments[0]].join(' ')} Z`;
};
