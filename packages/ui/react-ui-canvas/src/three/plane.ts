//
// Copyright 2026 DXOS.org
//

import { type Scene } from '@dxos/scene';

/** The plane the editor works in: the grid is drawn on it, and shapes are created and dragged along it. */
export type WorkPlane = { origin: Scene.Vec3; normal: Scene.Vec3 };

/** The ground: the y = 0 plane through the origin, Babylon's y being up. */
export const GROUND_PLANE: WorkPlane = { origin: { x: 0, y: 0, z: 0 }, normal: { x: 0, y: 1, z: 0 } };

/** The plane parallel to `plane` through `point`. */
export const planeThrough = (plane: WorkPlane, point: Scene.Vec3): WorkPlane => ({
  origin: { x: point.x, y: point.y, z: point.z },
  normal: plane.normal,
});

/** The world axes that lie in `plane`, for an axis-aligned plane: those a drag along it moves and snaps on. */
export const planeAxes = (plane: WorkPlane): ('x' | 'y' | 'z')[] =>
  (['x', 'y', 'z'] as const).filter((axis) => Math.abs(plane.normal[axis]) < 0.5);
