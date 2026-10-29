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
      const from = before.scale ?? UNIT;
      const factor = {
        x: round(after.scale.x / (from.x || 1)),
        y: round(after.scale.y / (from.y || 1)),
        z: round(after.scale.z / (from.z || 1)),
      };
      return changed(factor, 1) ? { kind: 'scale', ids: [id], factor } : undefined;
    }
  }
};
