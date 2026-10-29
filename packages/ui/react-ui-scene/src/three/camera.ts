//
// Copyright 2026 DXOS.org
//

import { type Scene } from '@dxos/scene';

type Vec3 = Scene.Vec3;

/** Babylon's `ArcRotateCamera` pose. */
export type OrbitPose = { alpha: number; beta: number; radius: number; target: Vec3 };

export type Viewport = { width: number; height: number };

/** Keeps the camera off the poles, where the orbit's up vector flips. */
const BETA_LIMIT = 0.01;

const radians = (degrees: number) => (degrees * Math.PI) / 180;

/**
 * A scene camera as an orbit pose: yaw 0 looks from the front (−z) towards +z, as Babylon's left-handed scene is
 * usually seen; pitch is the angle above the horizon, 90 looking straight down.
 */
export const toOrbit = ({ target, yaw, pitch, distance }: Scene.Camera3D): OrbitPose => ({
  alpha: -Math.PI / 2 + radians(yaw),
  beta: Math.max(BETA_LIMIT, Math.min(Math.PI - BETA_LIMIT, Math.PI / 2 - radians(pitch))),
  radius: Math.max(1e-3, distance),
  target,
});

/** Where the camera sits: `ArcRotateCamera` places it at `target + radius·(cos α sin β, cos β, sin α sin β)`. */
export const cameraPosition = ({ alpha, beta, radius, target }: OrbitPose): Vec3 => ({
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

/** Half the view's height in world units at the target, which an orthographic camera shows at every depth. */
export const orthoHalfHeight = (camera: Scene.Camera3D): number => camera.distance * Math.tan(camera.fov / 2);

/**
 * A world point in pixels from the viewport's top left, with a world `radius` in pixels at its depth; undefined for a
 * point at or behind a perspective camera. The axes are those Babylon's `LookAtLH` builds with +y up.
 */
export const project = (
  camera: Scene.Camera3D,
  viewport: Viewport,
  point: Vec3,
  radius = 0,
): { x: number; y: number; radius: number } | undefined => {
  const pose = toOrbit(camera);
  const eye = cameraPosition(pose);
  const forward = normalize(subtract(pose.target, eye));
  const right = normalize(cross({ x: 0, y: 1, z: 0 }, forward));
  const up = cross(forward, right);
  const offset = subtract(point, eye);
  const depth = dot(offset, forward);
  const aspect = viewport.width / Math.max(1, viewport.height);
  const half =
    camera.projection === 'orthographic'
      ? orthoHalfHeight(camera)
      : depth > 1e-6
        ? depth * Math.tan(camera.fov / 2)
        : 0;
  if (half <= 0) {
    return undefined;
  }
  const ndcX = dot(offset, right) / (half * aspect);
  const ndcY = dot(offset, up) / half;
  return {
    x: ((ndcX + 1) / 2) * viewport.width,
    y: ((1 - ndcY) / 2) * viewport.height,
    radius: (radius / half) * (viewport.height / 2),
  };
};
