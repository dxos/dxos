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

/** The camera's eye and its view axes, as Babylon's `LookAtLH` builds them with +y up. */
const basis = (camera: Scene.Camera3D): { eye: Vec3; forward: Vec3; right: Vec3; up: Vec3 } => {
  const pose = toOrbit(camera);
  const eye = cameraPosition(pose);
  const forward = normalize(subtract(pose.target, eye));
  const right = normalize(cross({ x: 0, y: 1, z: 0 }, forward));
  return { eye, forward, right, up: cross(forward, right) };
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
  const { eye, forward, right, up } = basis(camera);
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

/** The ray through a pixel: from the eye (perspective) or the view plane (orthographic), along the view. */
const screenRay = (camera: Scene.Camera3D, viewport: Viewport, screen: { x: number; y: number }) => {
  const { eye, forward, right, up } = basis(camera);
  const aspect = viewport.width / Math.max(1, viewport.height);
  const ndcX = (screen.x / Math.max(1, viewport.width)) * 2 - 1;
  const ndcY = 1 - (screen.y / Math.max(1, viewport.height)) * 2;
  const along = (axis: Vec3, amount: number): Vec3 => ({ x: axis.x * amount, y: axis.y * amount, z: axis.z * amount });
  const sum = (...vectors: Vec3[]): Vec3 =>
    vectors.reduce((total, vector) => ({ x: total.x + vector.x, y: total.y + vector.y, z: total.z + vector.z }));
  if (camera.projection === 'orthographic') {
    const half = orthoHalfHeight(camera);
    return { origin: sum(eye, along(right, ndcX * half * aspect), along(up, ndcY * half)), direction: forward };
  }
  const half = Math.tan(camera.fov / 2);
  return { origin: eye, direction: sum(forward, along(right, ndcX * half * aspect), along(up, ndcY * half)) };
};

/**
 * Where the ray through a pixel meets the horizontal plane at `height` (the ground by default); undefined when the ray
 * runs parallel to the plane or points away from it. The inverse of `project` for points on that plane.
 */
export const groundPoint = (
  camera: Scene.Camera3D,
  viewport: Viewport,
  screen: { x: number; y: number },
  height = 0,
): Vec3 | undefined => {
  const { origin, direction } = screenRay(camera, viewport, screen);
  if (Math.abs(direction.y) < 1e-9) {
    return undefined;
  }
  const distance = (height - origin.y) / direction.y;
  if (distance <= 0) {
    return undefined;
  }
  return { x: origin.x + direction.x * distance, y: height, z: origin.z + direction.z * distance };
};

/** Degrees the orbit turns per pixel dragged. */
const DEGREES_PER_PIXEL = 0.4;

/** Keeps the pitch short of the poles, where `toOrbit` clamps and a drag would stop responding. */
const PITCH_LIMIT = 89;

type Delta = { x: number; y: number };

/** Turns the camera about its target by a drag of `delta` pixels: right turns the scene right, down looks from higher. */
export const orbitBy = (camera: Scene.Camera3D, delta: Delta): Scene.Camera3D => ({
  ...camera,
  yaw: camera.yaw - delta.x * DEGREES_PER_PIXEL,
  pitch: Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, camera.pitch + delta.y * DEGREES_PER_PIXEL)),
});

/** Moves the target in the view plane so that the scene follows a drag of `delta` pixels. */
export const panBy = (camera: Scene.Camera3D, delta: Delta, viewport: Viewport): Scene.Camera3D => {
  const { right, up } = basis(camera);
  // The world size of a pixel at the target's depth, where perspective and orthographic views agree.
  const perPixel = (2 * orthoHalfHeight(camera)) / Math.max(1, viewport.height);
  const along = (axis: Vec3, pixels: number): Vec3 => ({
    x: axis.x * pixels * perPixel,
    y: axis.y * pixels * perPixel,
    z: axis.z * pixels * perPixel,
  });
  const shift = subtract(along(up, delta.y), along(right, delta.x));
  return {
    ...camera,
    target: { x: camera.target.x + shift.x, y: camera.target.y + shift.y, z: camera.target.z + shift.z },
  };
};

/** Scales the distance to the target by `factor` (below 1 moves closer); orthographic views scale with it. */
export const zoomBy = (camera: Scene.Camera3D, factor: number): Scene.Camera3D => ({
  ...camera,
  distance: Math.max(1e-3, camera.distance * factor),
});
