//
// Copyright 2026 DXOS.org
//

import { Vector3 } from '@babylonjs/core/Maths/math';

import { type Vec3 } from '../engine';
import { type ObjectState, tangentFrame } from '../sim';
import type * as TerraObject from '../types/TerraObject';

const DEG = Math.PI / 180;

/**
 * Instance scale relative to each object's own surface/orbit radius, so scale stays planet-relative
 * at any zoom. Shared by every consumer of an object's frame — the rendered mesh, its gizmo rods,
 * and the chase camera's standoff — so all three agree on how big an object is.
 */
export const SCALE_FACTOR = 0.04;

/** An object's own axes in world space: `forward` along its long axis (nose), `up` its surface normal. */
export type ObjectFrame = { right: Vector3; up: Vector3; forward: Vector3 };

/** World-space forward tangent at `unit`, derived from `bearing` (degrees) via the local north/east frame. */
export const forwardAt = (unit: Vec3, bearing: number): Vector3 => {
  const { north, east } = tangentFrame(unit);
  const radians = bearing * DEG;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return new Vector3(north[0] * cos + east[0] * sin, north[1] * cos + east[1] * sin, north[2] * cos + east[2] * sin);
};

/**
 * A rocket's nose pitch, in radians, at `flightFraction` through its ballistic arc: `+90°` (nose
 * along the surface normal) at launch, `0°` (nose along the horizontal tangent) at apex, `-90°`
 * (nose along the inverse normal) at touchdown. `90 * cos(pi * fraction)` alone gives exactly that
 * curve — a rocket that noses over smoothly rather than snapping through the horizontal at apex.
 */
export const rocketPitch = (flightFraction: number): number => 90 * DEG * Math.cos(Math.PI * flightFraction);

/**
 * `tangentForward` rotated toward `up` by `pitch` radians. `tangentForward` and `up` are already
 * orthonormal (the tangent frame is perpendicular to the surface normal by construction), so this
 * stays unit length for any `pitch` without renormalizing.
 */
const pitchForward = (tangentForward: Vector3, up: Vector3, pitch: number): Vector3 =>
  tangentForward.scale(Math.cos(pitch)).add(up.scale(Math.sin(pitch)));

/**
 * The object's own orthonormal frame at `state`, using `heading` (the frame-eased render heading,
 * not necessarily `state.bearing` itself — see `heading.ts`). `up` is the surface normal and
 * `forward` the heading tangent, except for a rocket, whose forward is pitched toward/away from the
 * normal by `state.flightFraction` so it flies nose-up at launch and nose-down at touchdown.
 */
export const objectFrame = (state: ObjectState, kind: TerraObject.Kind, heading: number): ObjectFrame => {
  const tangentForward = forwardAt(state.unit, heading);
  const up = new Vector3(state.unit[0], state.unit[1], state.unit[2]);
  // The rotation axis for a rocket's pitch: computed from the *unpitched* tangent/up pair so it
  // stays well-defined (unit length) at every pitch angle, including ±90°.
  const right = Vector3.Cross(up, tangentForward).normalize();
  const forward =
    kind === 'rocket' ? pitchForward(tangentForward, up, rocketPitch(state.flightFraction)) : tangentForward;
  return { right, up: Vector3.Cross(forward, right).normalize(), forward };
};
