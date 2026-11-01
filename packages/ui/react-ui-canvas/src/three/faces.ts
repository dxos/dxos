//
// Copyright 2026 DXOS.org
//

import { type Scene } from '@dxos/scene';

import { magnetTo, nearestStop, snapTo } from '../utils/index.ts';

type Axis = 'x' | 'y' | 'z';

/** World axis-aligned bounds of an item. */
export type Box = { min: Scene.Vec3; max: Scene.Vec3 };

/** A side of an item's box, named by the outward axis normal. */
export type FaceRef = { key: string; normal: Scene.Vec3 };

/** A move along an axis that brings a moving side onto `face`. */
export type FaceStop = { delta: number; face: FaceRef };

const axisNormal = (axis: Axis, sign: number): Scene.Vec3 => ({
  x: axis === 'x' ? sign : 0,
  y: axis === 'y' ? sign : 0,
  z: axis === 'z' ? sign : 0,
});

/**
 * Every move along `axis` that puts one of the `sides` (coordinates of the moving faces) onto a side of another box;
 * snapping picks the nearest within its detent, so a dragged face lands flush against its neighbours.
 */
export const faceStops = (sides: readonly number[], boxes: Readonly<Record<string, Box>>, axis: Axis): FaceStop[] =>
  Object.entries(boxes).flatMap(([key, box]) =>
    sides.flatMap((side) => [
      { delta: box.min[axis] - side, face: { key, normal: axisNormal(axis, -1) } },
      { delta: box.max[axis] - side, face: { key, normal: axisNormal(axis, 1) } },
    ]),
  );

/**
 * The points of a box's side (named by its axis-aligned outward `normal`) that a drag snaps to: its corners, the middles
 * of its edges and its centre.
 */
export const facePoints = (box: Box, normal: Scene.Vec3): Scene.Vec3[] => {
  const axes = ['x', 'y', 'z'] as const;
  const across = axes.filter((axis) => normal[axis] === 0);
  const out = axes.find((axis) => normal[axis] !== 0);
  const [first, second] = across;
  if (!out || !first || !second) {
    return [];
  }
  const at = normal[out] > 0 ? box.max[out] : box.min[out];
  const stops = (axis: Axis) => [box.min[axis], (box.min[axis] + box.max[axis]) / 2, box.max[axis]];
  return stops(first).flatMap((one) =>
    stops(second).map((two) => ({ x: 0, y: 0, z: 0, [out]: at, [first]: one, [second]: two })),
  );
};

/** The sides of other boxes that faces at `sides` along `axis` lie on, so what a drag has snapped to can be shown. */
export const flushWith = (sides: readonly number[], boxes: Readonly<Record<string, Box>>, axis: Axis): FaceRef[] =>
  faceStops(sides, boxes, axis).flatMap(({ delta, face }) => (Math.abs(delta) < 1e-6 ? [face] : []));

/**
 * How far to shift a body moving along `axis`, whose faces that way are at `sides` (low first): flush onto the nearest
 * side of another box within `detent`, which is what a person lining things up wants most; else its low side held on the
 * grid (`magnetTo` while dragging, `snapTo` on `landing`). `face` names the side it is flush with.
 */
export const snapSides = ({
  sides,
  axis,
  boxes,
  step,
  detent,
  landing = false,
}: {
  sides: readonly number[];
  axis: Axis;
  boxes: Readonly<Record<string, Box>>;
  step: number;
  detent: number;
  landing?: boolean;
}): { delta: number; face?: FaceRef } => {
  const stop = nearestStop(0, faceStops(sides, boxes, axis), detent);
  if (stop) {
    return stop;
  }
  const [low] = sides;
  if (step <= 0 || low === undefined) {
    return { delta: 0 };
  }
  return { delta: (landing ? snapTo(low, step) : magnetTo(low, step, detent)) - low };
};
