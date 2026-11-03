//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { GROUND_PLANE, planeAxes, planeThrough } from './plane.ts';

describe('WorkPlane', () => {
  test('the ground is the y = 0 plane through the origin, along x and z', () => {
    expect(GROUND_PLANE).toEqual({ origin: { x: 0, y: 0, z: 0 }, normal: { x: 0, y: 1, z: 0 } });
    expect(planeAxes(GROUND_PLANE)).toEqual(['x', 'z']);
  });

  test('a plane through a point keeps the normal and moves the origin there', () => {
    expect(planeThrough(GROUND_PLANE, { x: 1, y: 2, z: 3 })).toEqual({
      origin: { x: 1, y: 2, z: 3 },
      normal: { x: 0, y: 1, z: 0 },
    });
    expect(planeAxes({ origin: { x: 0, y: 0, z: 0 }, normal: { x: 1, y: 0, z: 0 } })).toEqual(['y', 'z']);
  });
});
