//
// Copyright 2026 DXOS.org
//

import { type Vec3, add, cross, dot, normalize, scale, sub } from '../engine/index.ts';

/** A position on the planet; `lat`/`lng` in degrees, `height` as a fraction of radius above sea level. */
export type GeoPoint = { lat: number; lng: number; height: number };

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;
const POLE: Vec3 = [0, 1, 0];

/** Unit-sphere position for a latitude/longitude, in the y-up frame the terrain uses. */
export const toUnit = ({ lat, lng }: Pick<GeoPoint, 'lat' | 'lng'>): Vec3 => {
  const phi = lat * DEG;
  const theta = lng * DEG;
  const cosPhi = Math.cos(phi);
  return [cosPhi * Math.sin(theta), Math.sin(phi), cosPhi * Math.cos(theta)];
};

/** Inverse of `toUnit`; longitude is normalized to (-180, 180]. */
export const toGeo = (unit: Vec3): { lat: number; lng: number } => ({
  lat: Math.asin(Math.min(1, Math.max(-1, unit[1]))) * RAD,
  lng: Math.atan2(unit[0], unit[2]) * RAD,
});

/**
 * Local north/east tangent basis at a point. Near the poles the pole vector is parallel to the
 * radial, so an arbitrary meridian is chosen to keep the basis defined.
 */
export const tangentFrame = (unit: Vec3): { north: Vec3; east: Vec3 } => {
  const radial = dot(POLE, unit);
  const projected = sub(POLE, scale(unit, radial));
  const magnitude = Math.hypot(projected[0], projected[1], projected[2]);
  const north = magnitude < 1e-9 ? normalize(cross(unit, [1, 0, 0])) : normalize(projected);
  return { north, east: cross(north, unit) };
};

/** Central angle between two unit vectors, in radians. */
export const angleBetween = (from: Vec3, to: Vec3): number => Math.acos(Math.min(1, Math.max(-1, dot(from, to))));

/** Bearing (degrees, [0, 360)) of tangent direction `direction` as observed at point `at`. */
export const bearingOfTangent = (at: Vec3, direction: Vec3): number => {
  const { north, east } = tangentFrame(at);
  const degrees = Math.atan2(dot(direction, east), dot(direction, north)) * RAD;
  return (degrees + 360) % 360;
};

/** Initial great-circle bearing from one point to another, in degrees [0, 360). */
export const bearingTo = (from: Vec3, to: Vec3): number => bearingOfTangent(from, sub(to, scale(from, dot(from, to))));

/**
 * The exact tangent direction of the great-circle geodesic from `from` to `to`, at `fraction` of
 * the way along it (`slerp(from, to, fraction)`'s point) — the derivative of that same
 * parametrization, not an approximation. Degenerate (zero) when `from` and `to` coincide. Feeding
 * this to `bearingOfTangent` gives the true course *at the traveled-to point*, which is not the
 * same as `bearingTo(from, to)` except at `fraction === 0`: a great circle's course drifts
 * continuously along its length unless it runs along the equator or a meridian.
 */
export const geodesicTangent = (from: Vec3, to: Vec3, fraction: number): Vec3 => {
  const angle = angleBetween(from, to);
  if (angle < 1e-12) {
    return [0, 0, 0];
  }
  return add(scale(from, -Math.cos((1 - fraction) * angle)), scale(to, Math.cos(fraction * angle)));
};

/** Interpolates along the great circle between two unit vectors. */
export const slerp = (from: Vec3, to: Vec3, fraction: number): Vec3 => {
  const angle = angleBetween(from, to);
  if (angle < 1e-12) {
    return from;
  }
  const sin = Math.sin(angle);
  const left = Math.sin((1 - fraction) * angle) / sin;
  const right = Math.sin(fraction * angle) / sin;
  return normalize(add(scale(from, left), scale(to, right)));
};

/** Moves along the great circle leaving `unit` on `bearing` by `angularDistance` radians. */
export const advance = (unit: Vec3, bearing: number, angularDistance: number): Vec3 => {
  const { north, east } = tangentFrame(unit);
  const radians = bearing * DEG;
  const direction = add(scale(north, Math.cos(radians)), scale(east, Math.sin(radians)));
  return normalize(add(scale(unit, Math.cos(angularDistance)), scale(direction, Math.sin(angularDistance))));
};

/** Rotates a bearing toward a target by at most `maxDelta` degrees, taking the shorter direction. */
export const turnToward = (current: number, target: number, maxDelta: number): number => {
  const delta = ((((target - current) % 360) + 540) % 360) - 180;
  const step = Math.max(-maxDelta, Math.min(maxDelta, delta));
  return (((current + step) % 360) + 360) % 360;
};
