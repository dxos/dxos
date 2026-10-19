//
// Copyright 2026 DXOS.org
//

import { type Size } from '../model/index.ts';

/** Bumps around a cloud's outline. */
const BUMPS = 9;

/** How far a bump stands out from the cloud's body, as a share of the frame's shorter half. */
const BULGE = 0.32;

const round = (value: number) => Math.round(value * 100) / 100;

/**
 * SVG path data for a cloud filling a frame of `size` (its own px, origin top-left), kept `inset` px inside the frame
 * so a stroke of twice that width stays within it: a ring of arcs, alternately larger and smaller, bulging out from an
 * ellipse inscribed in the frame.
 */
export const cloudPath = ({ width, height }: Size, inset = 0): string => {
  const outerX = Math.max(0, width / 2 - inset);
  const outerY = Math.max(0, height / 2 - inset);
  const bulge = Math.min(outerX, outerY) * BULGE;
  const radiusX = outerX - bulge;
  const radiusY = outerY - bulge;
  const points = Array.from({ length: BUMPS }, (_, index) => {
    // Rotated half a step so a bump, not a dip, crowns the top.
    const angle = -Math.PI / 2 + ((index + 0.5) * 2 * Math.PI) / BUMPS;
    return { x: width / 2 + radiusX * Math.cos(angle), y: height / 2 + radiusY * Math.sin(angle) };
  });
  const arcs = points.map((from, index) => {
    const to = points[(index + 1) % BUMPS];
    const chord = Math.hypot(to.x - from.x, to.y - from.y);
    // The sagitta: how far the arc stands off its chord.
    const sagitta = bulge * (index % 2 === 0 ? 1 : 0.75);
    const radius = (chord * chord) / 4 / (2 * sagitta) + sagitta / 2;
    const large = sagitta > chord / 2 ? 1 : 0;
    return `A ${round(radius)} ${round(radius)} 0 ${large} 1 ${round(to.x)} ${round(to.y)}`;
  });
  return `M ${round(points[0].x)} ${round(points[0].y)} ${arcs.join(' ')} Z`;
};
