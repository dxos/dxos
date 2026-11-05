//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { type Scene } from '@dxos/scene';

import { orbitView } from './hooks.ts';

const camera = (yaw: number): Scene.Camera3D => ({
  target: { x: 0, y: 0, z: 0 },
  yaw,
  pitch: 30,
  distance: 10,
  fov: 0.8,
  projection: 'perspective',
});

describe('orbitView', () => {
  test('a given camera of the same value, as a re-read document makes, keeps the orbit', () => {
    const moved = { from: camera(0), camera: camera(45) };
    expect(orbitView(moved, camera(0), true)).toEqual(camera(45));
  });

  test('a given camera of another value starts over from it', () => {
    expect(orbitView({ from: camera(0), camera: camera(45) }, camera(90), true)).toEqual(camera(90));
  });

  test('off, the given camera is the view', () => {
    expect(orbitView({ from: camera(0), camera: camera(45) }, camera(0), false)).toEqual(camera(0));
  });
});
