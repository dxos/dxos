//
// Copyright 2026 DXOS.org
//

import { type Viewport, meshProps } from '@dxos/react-ui-canvas/3d';
import { boundsFromPoints } from '@dxos/react-ui-canvas/headless';
import { type Scene } from '@dxos/scene';

import { screenLength } from './gizmo.ts';

/** A base swept on the ground: its centre (on the ground) and its extents along x and z. */
export type GroundBase = { center: Scene.Vec3; width: number; depth: number };

/** The least size a dragged shape takes when snapping is off. */
const FREE_MIN = 0.1;

const snapTo = (value: number, step: number) => (step > 0 ? Math.round(value / step) * step : value);

/**
 * The base a drag on the ground sweeps, as 2D sweeps a box (`boundsFromPoints`): its two corners snapped to `step`,
 * x and z on the ground standing in for 2D's x and y; undefined when it spans nothing.
 */
export const dragBase = (from: Scene.Vec3, to: Scene.Vec3, step: number): GroundBase | undefined => {
  const box = boundsFromPoints(
    { x: snapTo(from.x, step), y: snapTo(from.z, step) },
    { x: snapTo(to.x, step), y: snapTo(to.z, step) },
  );
  if (box.width === 0 || box.height === 0) {
    return undefined;
  }
  return { center: { x: box.x + box.width / 2, y: 0, z: box.y + box.height / 2 }, width: box.width, depth: box.height };
};

/** The height the pointer, `pixelsUp` above where the base was fixed, sets: in scene units, snapped, at least a step. */
export const dragHeight = (
  base: GroundBase,
  pixelsUp: number,
  camera: Scene.Camera3D,
  viewport: Viewport,
  step: number,
): number => {
  const perUnit = screenLength(camera, viewport, base.center, { x: 0, y: 1, z: 0 }) ?? 0;
  const height = perUnit > 0 ? snapTo(pixelsUp / perUnit, step) : 0;
  return Math.max(step > 0 ? step : FREE_MIN, height);
};

/**
 * The element a drag makes: a shape standing on its base at `height`; a sphere (no height step) takes the base's larger
 * extent as its diameter.
 */
export const createdElement = (
  id: string,
  kind: string,
  base: GroundBase,
  height: number | undefined,
): Scene.Element3D => {
  if (kind === 'sphere' || height === undefined) {
    const diameter = Math.max(base.width, base.depth);
    return {
      id,
      type: kind,
      center: { ...base.center, y: diameter / 2 },
      scale: { x: diameter, y: diameter, z: diameter },
    };
  }
  return {
    id,
    type: kind,
    center: { ...base.center, y: height / 2 },
    scale: { x: base.width, y: height, z: base.depth },
  };
};

/** An object's extents before its scale: a mesh's own, else the unit every primitive is. */
const unitExtents = (object: Scene.Object3D): Scene.Vec3 => {
  const mesh = object.type === 'mesh' ? meshProps(object.props) : undefined;
  const extent = (axis: number) => {
    const values = mesh?.positions.filter((_, index) => index % 3 === axis) ?? [];
    const size = values.length > 0 ? Math.max(...values) - Math.min(...values) : 1;
    return size > 0 ? size : 1;
  };
  return { x: extent(0), y: extent(1), z: extent(2) };
};

/**
 * An element placing `object` on the ground at `point`, at the scale its model `definition` gives it: stored on the
 * element, since a scale drag multiplies the element's own scale; raised by half its height, as a created shape is.
 */
export const placedElement = (
  id: string,
  object: string,
  definition: Scene.Object3D | undefined,
  point: Scene.Vec3,
): Scene.Element3D => {
  const scale = definition?.scale;
  const lift = ((definition ? unitExtents(definition).y : 1) * (scale?.y ?? 1)) / 2;
  return { id, object, center: { ...point, y: point.y + lift }, ...(scale ? { scale } : {}) };
};

/**
 * An element placing `object` dragged out over `base`: with its aspect locked, scaled evenly to cover the base;
 * otherwise stretched to the base and `height`. It stands on the ground, as a created shape does.
 */
export const placedOnBase = (
  id: string,
  object: string,
  definition: Scene.Object3D | undefined,
  base: GroundBase,
  height: number | undefined,
): Scene.Element3D => {
  const unit = definition ? unitExtents(definition) : { x: 1, y: 1, z: 1 };
  if (definition?.lockAspect || height === undefined) {
    const factor = Math.max(base.width / unit.x, base.depth / unit.z);
    return {
      id,
      object,
      center: { ...base.center, y: (unit.y * factor) / 2 },
      scale: { x: factor, y: factor, z: factor },
    };
  }
  return {
    id,
    object,
    center: { ...base.center, y: height / 2 },
    scale: { x: base.width / unit.x, y: height / unit.y, z: base.depth / unit.z },
  };
};

/** Whether a drag sizes in one step (the base alone) rather than base then height: a sphere, or a locked aspect. */
export const sizesInOneStep = (kind: string, definition?: Scene.Object3D): boolean =>
  kind === 'sphere' || definition?.lockAspect === true;
