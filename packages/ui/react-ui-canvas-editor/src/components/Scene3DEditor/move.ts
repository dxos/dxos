//
// Copyright 2026 DXOS.org
//

import { magnetTo, nearestStop, snapTo } from '@dxos/react-ui-canvas';
import { type Box } from '@dxos/react-ui-canvas/3d';
import { type Scene } from '@dxos/scene';

type Axis = 'x' | 'y' | 'z';

export type PlaneMove = {
  /** How far the pointer has carried the grab point, in world units. */
  delta: Scene.Vec3;
  /** The world bounds of what is moving, where the drag began. */
  box: Box;
  /** Where the body was grabbed, in the world. */
  grab: Scene.Vec3;
  /** The world axes the body may move along: the plane's two, or the one axis a held key picks. */
  axes: readonly Axis[];
  /** The grid's world step; zero leaves the body free of the grid. */
  step: number;
  /** The world length `DETENT_PX` spans along each axis, within which a side or the grid holds the body. */
  detent: Scene.Vec3;
  /** A point of another body the pointer is over: the grab point is held on it. */
  point?: Scene.Vec3;
  /** A side of another body the pointer is over, by its axis and where it lies: the body's nearer side is held flush. */
  face?: { axis: Axis; at: number };
  /** The drag is ending: the body lands on the grid rather than being held near it. */
  landing?: boolean;
};

/**
 * Where a dragged body moves along each of its `axes`: its grab point on the `point` the pointer is over, else its side
 * flush on the `face` the pointer is over within the detent, else its low corner held on (or, `landing`, put on) the grid.
 */
export const planeMove = ({
  delta,
  box,
  grab,
  axes,
  step,
  detent,
  point,
  face,
  landing = false,
}: PlaneMove): Scene.Vec3 => {
  const moved = { x: 0, y: 0, z: 0 };
  for (const axis of axes) {
    if (point) {
      // The pointer chose the point within the detent on screen, so it holds however far the grab is in depth.
      moved[axis] = point[axis] - grab[axis];
      continue;
    }
    const [low, high] = [box.min[axis] + delta[axis], box.max[axis] + delta[axis]];
    const flush =
      face?.axis === axis
        ? nearestStop(0, [{ delta: face.at - low }, { delta: face.at - high }], detent[axis])
        : undefined;
    const grid = step > 0 ? (landing ? snapTo(low, step) : magnetTo(low, step, detent[axis])) - low : 0;
    moved[axis] = delta[axis] + (flush ? flush.delta : grid);
  }
  return moved;
};

/** The point drawn nearest the pointer, if within `detent` pixels of it: what a drag over another body snaps to. */
export const nearestOnScreen = (
  points: readonly Scene.Vec3[],
  pointer: { x: number; y: number },
  toScreen: (point: Scene.Vec3) => { x: number; y: number } | undefined,
  detent: number,
): Scene.Vec3 | undefined =>
  points.reduce<{ point?: Scene.Vec3; gap: number }>(
    (best, point) => {
      const at = toScreen(point);
      const gap = at ? Math.hypot(at.x - pointer.x, at.y - pointer.y) : Infinity;
      return gap <= detent && gap < best.gap ? { point, gap } : best;
    },
    { gap: Infinity },
  ).point;
