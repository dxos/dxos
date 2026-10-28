//
// Copyright 2026 DXOS.org
//

//
// The orbit camera and its projection, in Babylon's conventions (left-handed, vertical field of view), computed
// without Babylon so the overlay anchors and labels match the frame exactly and can be tested headless.
//

import { type Vec3 } from '@dxos/animation';
import type * as AnimatorCapabilities from '@dxos/plugin-animator/AnimatorCapabilities';

import { type Scene } from '#types';

import { radiusOf, sceneObjects, vec3Or } from './stage.ts';

/** An orbit camera's pose: spherical coordinates about `target` (Babylon's `ArcRotateCamera`). */
export type OrbitCamera = { alpha: number; beta: number; radius: number; target: Vec3 };

export const DEFAULT_CAMERA: OrbitCamera = {
  alpha: -Math.PI / 4,
  beta: Math.PI / 3,
  radius: 10,
  target: { x: 0, y: 0, z: 0 },
};

/** The vertical field of view, in radians (Babylon's default). */
export const STAGE_FOV = 0.8;

/** Keeps the camera off the poles, where its up vector is undefined; Babylon clamps by the same amount. */
export const BETA_LIMIT = 0.01;

export type Viewport = { width: number; height: number };

const numberOr = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

/** The camera of a sample, with unset properties from `fallback` and `beta` kept off the poles. */
export const cameraOf = (
  values: Readonly<Record<string, unknown>> | undefined,
  fallback: OrbitCamera = DEFAULT_CAMERA,
): OrbitCamera => ({
  alpha: numberOr(values?.alpha, fallback.alpha),
  beta: Math.max(BETA_LIMIT, Math.min(Math.PI - BETA_LIMIT, numberOr(values?.beta, fallback.beta))),
  radius: Math.max(1e-3, numberOr(values?.radius, fallback.radius)),
  target: vec3Or(values?.target, fallback.target),
});

/** Where the camera sits: `ArcRotateCamera` places it at `target + radius·(cos α sin β, cos β, sin α sin β)`. */
export const cameraPosition = ({ alpha, beta, radius, target }: OrbitCamera): Vec3 => ({
  x: target.x + radius * Math.cos(alpha) * Math.sin(beta),
  y: target.y + radius * Math.cos(beta),
  z: target.z + radius * Math.sin(alpha) * Math.sin(beta),
});

const subtract = (left: Vec3, right: Vec3): Vec3 => ({ x: left.x - right.x, y: left.y - right.y, z: left.z - right.z });
const dot = (left: Vec3, right: Vec3): number => left.x * right.x + left.y * right.y + left.z * right.z;
const cross = (left: Vec3, right: Vec3): Vec3 => ({
  x: left.y * right.z - left.z * right.y,
  y: left.z * right.x - left.x * right.z,
  z: left.x * right.y - left.y * right.x,
});
const normalize = (value: Vec3): Vec3 => {
  const length = Math.hypot(value.x, value.y, value.z) || 1;
  return { x: value.x / length, y: value.y / length, z: value.z / length };
};

/** The camera's axes in world space, as Babylon's `LookAtLH` builds them with a world-up of +y. */
const cameraAxes = (camera: OrbitCamera) => {
  const eye = cameraPosition(camera);
  const forward = normalize(subtract(camera.target, eye));
  const right = normalize(cross({ x: 0, y: 1, z: 0 }, forward));
  const up = cross(forward, right);
  return { eye, forward, right, up };
};

/**
 * A world point and radius in pixels from the viewport's top left, with its radius projected at its depth; undefined
 * for a point at or behind the camera.
 */
export const projectSphere = (
  camera: OrbitCamera,
  viewport: Viewport,
  point: Vec3,
  radius = 0,
  fov = STAGE_FOV,
): AnimatorCapabilities.ProjectedAnchor | undefined => {
  const { eye, forward, right, up } = cameraAxes(camera);
  const offset = subtract(point, eye);
  const depth = dot(offset, forward);
  if (depth <= 1e-6) {
    return undefined;
  }
  const focal = Math.tan(fov / 2);
  const aspect = viewport.width / Math.max(1, viewport.height);
  const ndcX = dot(offset, right) / (depth * focal * aspect);
  const ndcY = dot(offset, up) / (depth * focal);
  return {
    x: ((ndcX + 1) / 2) * viewport.width,
    y: ((1 - ndcY) / 2) * viewport.height,
    radius: (radius / (depth * focal)) * (viewport.height / 2),
  };
};

/** The orbit radius that fits a sphere of `fit` about the target in the narrower field of view (echo3d's framing). */
export const fitRadius = (fit: number, aspect = 16 / 9, fov = STAGE_FOV): number => {
  const vertical = fov / 2;
  const horizontal = Math.atan(Math.tan(vertical) * aspect);
  return fit / Math.sin(Math.min(vertical, horizontal));
};

/** A pose that frames every object of the scene at rest, seen from in front and above. */
export const defaultCamera = (scene: Scene.Scene, aspect?: number): OrbitCamera => {
  const objects = sceneObjects(scene);
  if (objects.length === 0) {
    return DEFAULT_CAMERA;
  }
  const sum = objects.reduce(
    (total, object) => ({
      x: total.x + object.position.x,
      y: total.y + object.position.y,
      z: total.z + object.position.z,
    }),
    { x: 0, y: 0, z: 0 },
  );
  const target = { x: sum.x / objects.length, y: sum.y / objects.length, z: sum.z / objects.length };
  const extent = Math.max(
    ...objects.map(
      (object) =>
        Math.hypot(object.position.x - target.x, object.position.y - target.y, object.position.z - target.z) +
        radiusOf(object.scale),
    ),
  );
  return { alpha: -Math.PI / 2, beta: Math.PI / 3, radius: fitRadius(Math.max(extent, 0.5) * 1.1, aspect), target };
};
