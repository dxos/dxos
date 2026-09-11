//
// Copyright 2026 DXOS.org
//

import { type Vec3 } from './noise.ts';

// Six cube faces via local-up basis (Sebastian Lague style).
export const FACE_UPS: Vec3[] = [
  [0, 1, 0],
  [0, -1, 0],
  [1, 0, 0],
  [-1, 0, 0],
  [0, 0, 1],
  [0, 0, -1],
];

export const normalize = (v: Vec3): Vec3 => {
  const len = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / len, v[1] / len, v[2] / len];
};

export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];

export const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

export const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

export const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];

/** Tangent axes for a cube face, spanning the face perpendicular to its `up` normal. */
export const faceBasis = (up: Vec3): { axisA: Vec3; axisB: Vec3 } => {
  const axisA: Vec3 = [up[1], up[2], up[0]];
  const axisB = cross(up, axisA);
  return { axisA, axisB };
};

/** Unit-sphere point for grid cell corner (i, j) on a cube face of the given resolution. */
export const unitOnFace = (up: Vec3, axisA: Vec3, axisB: Vec3, i: number, j: number, resolution: number): Vec3 => {
  const px = (i / resolution) * 2 - 1;
  const py = (j / resolution) * 2 - 1;
  return normalize([
    up[0] + px * axisA[0] + py * axisB[0],
    up[1] + px * axisA[1] + py * axisB[1],
    up[2] + px * axisA[2] + py * axisB[2],
  ]);
};
