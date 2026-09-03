//
// Copyright 2026 DXOS.org
//

import { type Vec3 } from '../engine/index.ts';
import { angleBetween, bearingOfTangent, geodesicTangent, slerp } from './geo.ts';

/** Stable fallback point used only when a definition is missing geo data it needs — never throw. */
export const FALLBACK_UNIT: Vec3 = [0, 1, 0];

export const clampNonNegative = (value: number): number => Math.max(0, value);

/**
 * Bearing at the end of the last non-degenerate segment in a route (the course an object arrives
 * on), or 0 if every segment is degenerate. Evaluated at the segment's end point via
 * `geodesicTangent`, not at its start — a great circle's course drifts along its length, so the
 * arrival bearing is generally not the same as the segment's initial `bearingTo`.
 */
const finalBearing = (route: readonly Vec3[]): number => {
  for (let index = route.length - 2; index >= 0; index--) {
    const to = route[index + 1];
    if (angleBetween(route[index], to) >= 1e-12) {
      return bearingOfTangent(to, geodesicTangent(route[index], to, 1));
    }
  }
  return 0;
};

/**
 * The point at arc length `distance` along a great-circle polyline, its forward tangent as a
 * bearing, and whether the end of the route was reached. Pure function of `(route, distance)` —
 * this is the core of the determinism guarantee: no accumulator, so the same distance always
 * yields the same point regardless of how it was computed. Handles empty, single-point, and
 * zero-length-segment routes without throwing.
 */
export const walkRoute = (route: readonly Vec3[], distance: number): { unit: Vec3; bearing: number; done: boolean } => {
  if (route.length === 0) {
    return { unit: FALLBACK_UNIT, bearing: 0, done: true };
  }
  if (route.length === 1) {
    return { unit: route[0], bearing: 0, done: true };
  }

  const target = clampNonNegative(distance);
  let traveled = 0;
  for (let index = 0; index < route.length - 1; index++) {
    const from = route[index];
    const to = route[index + 1];
    const segment = angleBetween(from, to);
    if (segment < 1e-12) {
      // Zero-length segment (duplicate waypoint): contributes no distance, skip to avoid dividing by zero.
      continue;
    }
    if (traveled + segment >= target) {
      const fraction = (target - traveled) / segment;
      const point = slerp(from, to, fraction);
      // Bearing at the *traveled-to point*, not the segment's start — see `geodesicTangent`'s doc.
      return { unit: point, bearing: bearingOfTangent(point, geodesicTangent(from, to, fraction)), done: false };
    }
    traveled += segment;
  }

  return { unit: route[route.length - 1], bearing: finalBearing(route), done: true };
};

/**
 * Visits `count` evenly spaced points along `route`, starting at arc length `start`, in a single
 * pass over the polyline — `walkRoute` per point would rescan it from the beginning every time,
 * which is what makes a windowed lookahead cost O(route × samples) rather than O(route + samples).
 * Distances before the route's start or past its end clamp to its endpoints, as `walkRoute` does.
 * Takes a visitor rather than returning an array because its callers run on the simulation's hot
 * path, where a per-call allocation is the thing being avoided.
 */
export const walkRouteSeries = (
  route: readonly Vec3[],
  start: number,
  spacing: number,
  count: number,
  visit: (index: number, unit: Vec3) => void,
): void => {
  if (route.length === 0) {
    for (let index = 0; index < count; index++) {
      visit(index, FALLBACK_UNIT);
    }
    return;
  }
  if (route.length === 1) {
    for (let index = 0; index < count; index++) {
      visit(index, route[0]);
    }
    return;
  }

  let index = 0;
  let traveled = 0;
  for (let segment = 0; segment < route.length - 1 && index < count; segment++) {
    const from = route[segment];
    const to = route[segment + 1];
    const length = angleBetween(from, to);
    if (length < 1e-12) {
      continue;
    }
    // Every requested distance that falls inside this segment, in order.
    while (index < count) {
      const distance = clampNonNegative(start + index * spacing);
      if (distance > traveled + length) {
        break;
      }
      visit(index, slerp(from, to, (distance - traveled) / length));
      index++;
    }
    traveled += length;
  }

  // Anything past the end of the route sits at its final point.
  for (; index < count; index++) {
    visit(index, route[route.length - 1]);
  }
};

/**
 * Total arc length of `route`, in radians — the sum of each segment's central angle. Zero for
 * empty or single-point routes. `sim/engine.ts` divides this by an object's `speed` to get how long
 * (in seconds) a leg takes to walk end to end, which is what makes leg duration variable rather
 * than tied to a fixed clock.
 */
export const routeLength = (route: readonly Vec3[]): number => {
  let total = 0;
  for (let index = 0; index < route.length - 1; index++) {
    total += angleBetween(route[index], route[index + 1]);
  }
  return total;
};
