//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { type Resolved3D } from '@dxos/scene';

import { type RenderItem } from '../../three/index.ts';
import { IDENTITY, frameTransform, scaleToLocal, toLocal } from './frame.ts';

/** A frame fitted at (10, 0, 0) and half size: each part is drawn at offset + centre / 2. */
const FRAME = { offset: { x: 10, y: 0, z: 0 }, scale: 0.5 };

const drawn = (element: Resolved3D): RenderItem => {
  const center = element.center ?? { x: 0, y: 0, z: 0 };
  const scale = element.scale ?? { x: 1, y: 1, z: 1 };
  return {
    key: `frame/${element.id}`,
    id: element.id,
    elements: {},
    kind: element.kind,
    center: {
      x: FRAME.offset.x + center.x * FRAME.scale,
      y: FRAME.offset.y + center.y * FRAME.scale,
      z: FRAME.offset.z + center.z * FRAME.scale,
    },
    scale: { x: scale.x * FRAME.scale, y: scale.y * FRAME.scale, z: scale.z * FRAME.scale },
    rotation: { x: 0, y: 0, z: 0 },
  };
};

describe('frameTransform', () => {
  test('reads the fitted frame from a drawn element with a centre, past one without', () => {
    const solid: Resolved3D = { id: 's', kind: 'solid' };
    const cube: Resolved3D = { id: 'c', kind: 'cube', center: { x: 4, y: 2, z: 0 }, scale: { x: 2, y: 2, z: 2 } };
    expect(
      frameTransform([
        [drawn(solid), solid],
        [drawn(cube), cube],
      ]),
    ).toEqual(FRAME);
  });

  test('is the identity with no usable element, and never divides by zero', () => {
    const flat: Resolved3D = { id: 'f', kind: 'cube', center: { x: 1, y: 0, z: 0 }, scale: { x: 0, y: 1, z: 1 } };
    expect(frameTransform([[drawn(flat), flat]])).toEqual(IDENTITY);
    expect(frameTransform([])).toEqual(IDENTITY);
  });

  test('a world point and a world scale in the frame map back to the layout', () => {
    expect(toLocal(FRAME, { x: 12, y: 1, z: -0.5 })).toEqual({ x: 4, y: 2, z: -1 });
    expect(scaleToLocal(FRAME, { x: 1.5, y: 1, z: 0.5 })).toEqual({ x: 3, y: 2, z: 1 });
  });
});
