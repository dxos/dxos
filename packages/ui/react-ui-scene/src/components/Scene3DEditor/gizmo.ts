//
// Copyright 2026 DXOS.org
//

import { type LayoutIntent, type Resolved3D, type Scene } from '@dxos/scene';

import { type GizmoMode } from '../../three/index.ts';

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
