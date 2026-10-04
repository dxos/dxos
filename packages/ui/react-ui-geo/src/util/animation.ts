//
// Copyright 2026 DXOS.org
//

import { type GeoProjection, geoDistance } from 'd3';
import versor from 'versor';

import { type Vector } from '../hooks/context.ts';

/**
 * Duration scaled by great-circle distance between two geo positions.
 * Ensures long jumps animate longer than short ones while clamping to a
 * minimum base. `scale` controls how steeply duration grows with distance
 * (ms per radian of arc).
 */
export const flyDuration = (p1: [number, number], p2: [number, number], base: number, scale: number): number =>
  Math.max(base, geoDistance(p1, p2) * scale);

/**
 * Per-frame tween that interpolates the projection's rotation between two
 * Euler triples along the shortest great-circle arc using versors. Mutates
 * the projection and pushes the normalised rotation through `setRotation`.
 */
export const createRotationTween = (
  projection: GeoProjection,
  setRotation: (rotation: Vector) => void,
  r1: Vector,
  r2: Vector,
): ((t: number) => void) => {
  const iv = versor.interpolate(r1, r2);
  return (t: number) => {
    projection.rotate(iv(t));
    setRotation(projection.rotate() as Vector);
  };
};

/**
 * Per-frame tween that turns the globe about its axis to the target longitude while tilting to the
 * target latitude, keeping the poles upright; `versor` would take the great-circle path, which rolls
 * the globe on the way.
 */
export const createAxisRotationTween = (
  projection: GeoProjection,
  setRotation: (rotation: Vector) => void,
  r1: Vector,
  r2: Vector,
): ((t: number) => void) => {
  // The shorter way round: a turn of more than half the globe goes the other way.
  const lambda = ((((r2[0] - r1[0]) % 360) + 540) % 360) - 180;
  return (t: number) => {
    projection.rotate([r1[0] + lambda * t, r1[1] + (r2[1] - r1[1]) * t, r1[2] + (r2[2] - r1[2]) * t]);
    setRotation(projection.rotate() as Vector);
  };
};
