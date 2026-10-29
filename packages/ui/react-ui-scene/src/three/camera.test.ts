//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { type Scene } from '@dxos/scene';

import { cameraPosition, project, toOrbit } from './camera.ts';

const camera = (props: Partial<Scene.Camera3D> = {}): Scene.Camera3D => ({
  target: { x: 0, y: 0, z: 0 },
  yaw: 0,
  pitch: 0,
  distance: 10,
  fov: 0.8,
  projection: 'perspective',
  ...props,
});

describe('camera', () => {
  test('toOrbit maps yaw 0 pitch 0 to a camera in front, looking along +z', () => {
    const position = cameraPosition(toOrbit(camera()));
    expect(position.x).toBeCloseTo(0);
    expect(position.y).toBeCloseTo(0);
    expect(position.z).toBeCloseTo(-10);
  });

  test('pitch 90 looks straight down', () => {
    const position = cameraPosition(toOrbit(camera({ pitch: 90 })));
    expect(position.y).toBeCloseTo(10, 1);
  });

  test('project puts the target at the middle of the viewport', () => {
    const viewport = { width: 800, height: 600 };
    expect(project(camera({ yaw: 30, pitch: 20 }), viewport, { x: 0, y: 0, z: 0 })).toMatchObject({ x: 400, y: 300 });
    expect(project(camera({ projection: 'orthographic' }), viewport, { x: 0, y: 0, z: 0 })).toMatchObject({
      x: 400,
      y: 300,
    });
  });

  test('a point to the right in front view projects right of centre', () => {
    const point = project(camera(), { width: 800, height: 600 }, { x: 1, y: 0, z: 0 });
    expect(point?.x).toBeGreaterThan(400);
  });
});
