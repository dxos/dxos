//
// Copyright 2026 DXOS.org
//

import { type Size } from '../model/index.ts';

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

/**
 * SVG path data for a regular polygon of `sides` inscribed in a frame of `size` (stretched with it), a vertex on top,
 * kept `inset` px inside the frame.
 */
export const polygonPath = (size: Size, inset = 0, sides = DEFAULT_POLYGON_SIDES): string => {
  const count = Math.max(3, Math.round(sides));
  const points = ring(size, Math.max(0, size.width / 2 - inset), Math.max(0, size.height / 2 - inset), count);
  return `M ${points.map(({ x, y }) => `${round(x)} ${round(y)}`).join(' L ')} Z`;
};
