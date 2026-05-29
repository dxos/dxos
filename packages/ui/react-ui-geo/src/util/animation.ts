//
// Copyright 2026 DXOS.org
//

import { type GeoProjection, geoDistance } from 'd3';
import versor from 'versor';

import { type Vector } from '../hooks/context';

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
