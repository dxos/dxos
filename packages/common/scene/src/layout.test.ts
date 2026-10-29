//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, expect, test } from 'vitest';

import { Vec3 } from '@dxos/animation';

import { applyLayout, bounds2D, bounds3D, fitChild, ring } from './layout.ts';
import type * as Scene from './Scene.ts';

const ORIGIN: Vec3 = { x: 0, y: 0, z: 0 };

const cluster = (members: Scene.Element3D[]): Scene.SceneRecord3D => ({
  id: 'cluster',
  dim: '3d',
  camera: { target: ORIGIN, yaw: 0, pitch: 30, distance: 10, fov: 0.8, projection: 'perspective' },
  elements: Object.fromEntries(
    [
      ...members,
      {
        id: 'g',
        kind: 'group',
        members: members.map((member) => member.id),
        layout: { kind: 'ring', params: { radius: 3 } },
      },
    ].map((element) => [element.id, element]),
  ),
});

describe('layout', () => {
  test('ring places n members on a circle of the radius', () => {
    const positions = ring({ targets: ['a', 'b', 'c', 'd'], params: { radius: 2 }, values: () => ({}) });
    for (const value of Object.values(positions)) {
      const { x, y, z } = Schema.decodeUnknownSync(Vec3)(value);
      expect(Math.hypot(x, y, z)).toBeCloseTo(2);
    }
    expect(Object.keys(positions)).toHaveLength(4);
  });

  test('applyLayout places unpositioned members and keeps a pinned member', () => {
    const pinned: Vec3 = { x: 9, y: 9, z: 9 };
    const scene = applyLayout(
      cluster([
        { id: 'a', kind: 'sphere' },
        { id: 'b', kind: 'sphere', position: pinned, pinned: true },
      ]),
    );
    expect(scene.elements.b.position).toEqual(pinned);
    const { x, y, z } = scene.elements.a.position ?? ORIGIN;
    expect(Math.hypot(x, y, z)).toBeCloseTo(3);
  });

  test('bounds of an empty scene are zero', () => {
    expect(bounds3D(cluster([]))).toEqual({ center: ORIGIN, radius: 0 });
    expect(bounds2D({ id: 'e', dim: '2d', camera: { center: { x: 0, y: 0 }, zoom: 1 }, elements: {} })).toEqual({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    });
  });

  test('fitChild of an empty child has scale 1', () => {
    expect(fitChild({ center: ORIGIN, radius: 2 }, { center: ORIGIN, radius: 0 }).scale).toBe(1);
  });

  test('fitChild scales the child to 80% of the frame', () => {
    const fit = fitChild({ center: { x: 5, y: 0, z: 0 }, radius: 2 }, { center: { x: 1, y: 0, z: 0 }, radius: 4 });
    expect(fit.scale).toBeCloseTo(0.4);
    expect(fit.offset.x).toBeCloseTo(5 - 1 * 0.4);
  });
});
