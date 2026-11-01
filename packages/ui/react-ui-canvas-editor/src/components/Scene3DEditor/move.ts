//
// Copyright 2026 DXOS.org
//

import { type Box, type FaceRef, snapSides } from '@dxos/react-ui-canvas/3d';
import { type Scene } from '@dxos/scene';

type Axis = 'x' | 'y' | 'z';

export type PlaneMove = {
  /** How far the pointer has carried the grab point on the drag's plane, in world units. */
  delta: Scene.Vec3;
  /** The world bounds of what is moving, where the drag began. */
  box: Box;
  /** The world axes the plane spans; the body stays put along any other. */
  axes: readonly Axis[];
  /** The grid's world step; zero leaves the body free of the grid. */
  step: number;
  /** The world length `DETENT_PX` spans along each axis, within which a side or the grid holds the body. */
  detent: Scene.Vec3;
  /** Other bodies, whose sides the moving one is held flush against. */
  boxes?: Readonly<Record<string, Box>>;
  /** The drag is ending: the body lands on the grid rather than being held near it. */
  landing?: boolean;
};

/**
 * Where a body dragged on a plane moves: along each of the plane's axes, flush on a side of another body it passes near,
 * else its low corner held on (or, `landing`, put on) the grid; `faces` names the sides it is flush with.
 */
export const planeMove = ({
  delta,
  box,
  axes,
  step,
  detent,
  boxes = {},
  landing = false,
}: PlaneMove): { delta: Scene.Vec3; faces: FaceRef[] } => {
  const moved = { x: 0, y: 0, z: 0 };
  const faces: FaceRef[] = [];
  for (const axis of axes) {
    const held = snapSides({
      sides: [box.min[axis] + delta[axis], box.max[axis] + delta[axis]],
      axis,
      boxes,
      step,
      detent: detent[axis],
      landing,
    });
    moved[axis] = delta[axis] + held.delta;
    held.face && faces.push(held.face);
  }
  return { delta: moved, faces };
};
