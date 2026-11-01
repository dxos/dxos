//
// Copyright 2026 DXOS.org
//

import { type GizmoMode, type Viewport, project } from '@dxos/react-ui-canvas/3d';
import { type LayoutIntent, type Resolved3D, type Scene } from '@dxos/scene';

/** An element's transform in its layout's coordinates, as a gizmo leaves it. */
export type Transform3D = { center: Scene.Vec3; rotation: Scene.Vec3; scale: Scene.Vec3 };

const ZERO: Scene.Vec3 = { x: 0, y: 0, z: 0 };
const UNIT: Scene.Vec3 = { x: 1, y: 1, z: 1 };

const round = (value: number): number => Math.round(value * 1000) / 1000 + 0;

const changed = ({ x, y, z }: Scene.Vec3, unchanged: number) =>
  [x, y, z].some((value) => Math.abs(value - unchanged) > 1e-6);

/** The intent a finished gizmo drag makes of an element; undefined when the drag left it where it was. */
export const gizmoIntent = (
  mode: GizmoMode,
  id: string,
  before: Resolved3D,
  after: Transform3D,
): LayoutIntent | undefined => {
  switch (mode) {
    case 'move': {
      const from = before.center ?? ZERO;
      const delta = {
        x: round(after.center.x - from.x),
        y: round(after.center.y - from.y),
        z: round(after.center.z - from.z),
      };
      return changed(delta, 0) ? { kind: 'move', ids: [id], delta } : undefined;
    }
    case 'rotate': {
      const from = before.rotation ?? ZERO;
      const delta = {
        x: round(after.rotation.x - from.x),
        y: round(after.rotation.y - from.y),
        z: round(after.rotation.z - from.z),
      };
      return changed(delta, 0) ? { kind: 'rotate', ids: [id], delta } : undefined;
    }
    case 'scale': {
      // The scale it ends at, not a factor: the reducer sees only the stored element, whose scale may be its object's.
      const from = before.scale ?? UNIT;
      const value = { x: round(after.scale.x), y: round(after.scale.y), z: round(after.scale.z) };
      const moved = { x: value.x - from.x, y: value.y - from.y, z: value.z - from.z };
      return changed(moved, 0) ? { kind: 'update', id, path: ['scale'], value } : undefined;
    }
  }
};

/** How far a face drag must travel, in pixels, to extrude. */
const EXTRUDE_SLOP = 4;

/** The axis a face normal points along, with its sign: a box's faces, which extrusion moves, are axis-aligned. */
export const axisOf = ({ x, y, z }: Scene.Vec3): Scene.Vec3 => {
  const [ax, ay, az] = [Math.abs(x), Math.abs(y), Math.abs(z)];
  if (ax >= ay && ax >= az) {
    return { x: Math.sign(x) || 1, y: 0, z: 0 };
  }
  return ay >= az ? { x: 0, y: Math.sign(y) || 1, z: 0 } : { x: 0, y: 0, z: Math.sign(z) || 1 };
};

/** The pixels one world unit along `direction` spans on screen at `point`; undefined behind the camera. */
export const screenLength = (
  camera: Scene.Camera3D,
  viewport: Viewport,
  point: Scene.Vec3,
  direction: Scene.Vec3,
): number | undefined => {
  const from = project(camera, viewport, point);
  const to = project(camera, viewport, {
    x: point.x + direction.x,
    y: point.y + direction.y,
    z: point.z + direction.z,
  });
  return from && to ? Math.hypot(to.x - from.x, to.y - from.y) : undefined;
};

export type ExtrudeDrag = {
  /** The new solid's id. */
  id: string;
  /** The element whose face was dragged. */
  target: string;
  /** The picked face's world normal. */
  normal: Scene.Vec3;
  /** The drag's length along the normal as the screen shows it, positive outwards. */
  dragPixels: number;
  camera: Scene.Camera3D;
  viewport: Viewport;
  /** Where the face was picked, in world coordinates. */
  point: Scene.Vec3;
};

/**
 * The `extrude` a face drag makes: its distance is the world length the drag spans along the face's normal at the
 * picked point. Undefined for a drag shorter than a click's slop, or a normal seen end-on.
 */
export const extrudeIntent = ({
  id,
  target,
  normal,
  dragPixels,
  camera,
  viewport,
  point,
}: ExtrudeDrag): LayoutIntent | undefined => {
  if (Math.abs(dragPixels) < EXTRUDE_SLOP) {
    return undefined;
  }
  const face = axisOf(normal);
  const pixels = screenLength(camera, viewport, point, face);
  if (pixels === undefined || pixels < 1e-3) {
    return undefined;
  }
  return { kind: 'extrude', id, target, face, distance: round(dragPixels / pixels) };
};
