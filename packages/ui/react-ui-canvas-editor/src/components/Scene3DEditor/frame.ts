//
// Copyright 2026 DXOS.org
//

import { type RenderItem } from '@dxos/react-ui-canvas/3d';
import { type Resolved3D, type Scene } from '@dxos/scene';

/** How a layout's local coordinates map to the world: a uniform scale, then an offset (frames carry no rotation). */
export type FrameTransform = { offset: Scene.Vec3; scale: number };

export const IDENTITY: FrameTransform = { offset: { x: 0, y: 0, z: 0 }, scale: 1 };

const round = (value: number) => Math.round(value * 1000) / 1000 + 0;

/**
 * The transform read back from the first drawn element that can show it: one with a centre and a usable scale. An
 * element with no centre is drawn at the frame's origin whatever the offset, so it cannot.
 */
export const frameTransform = (drawn: Iterable<readonly [RenderItem, Resolved3D]>): FrameTransform => {
  for (const [item, element] of drawn) {
    const ratio = item.scale.x / (element.scale?.x ?? 1);
    if (!element.center || !Number.isFinite(ratio) || ratio <= 0) {
      continue;
    }
    return {
      scale: ratio,
      offset: {
        x: item.center.x - element.center.x * ratio,
        y: item.center.y - element.center.y * ratio,
        z: item.center.z - element.center.z * ratio,
      },
    };
  }
  return IDENTITY;
};

/** A world point in the layout's coordinates. */
export const toLocal = ({ offset, scale }: FrameTransform, point: Scene.Vec3): Scene.Vec3 => ({
  x: round((point.x - offset.x) / scale),
  y: round((point.y - offset.y) / scale),
  z: round((point.z - offset.z) / scale),
});

/** A world scale in the layout's coordinates. */
export const scaleToLocal = ({ scale }: FrameTransform, value: Scene.Vec3): Scene.Vec3 => ({
  x: round(value.x / scale),
  y: round(value.y / scale),
  z: round(value.z / scale),
});
