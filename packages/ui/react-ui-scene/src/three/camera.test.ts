//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { type Scene } from '@dxos/scene';

import { cameraPosition, groundPoint, orbitBy, panBy, project, toOrbit, zoomBy } from './camera.ts';

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

  describe('pointer moves', () => {
    const viewport = { width: 800, height: 600 };

    test('dragging right turns the scene right: a point in front of the target moves right', () => {
      const before = camera({ yaw: 0, pitch: 20 });
      const front = { x: 0, y: 0, z: -2 };
      const after = orbitBy(before, { x: 50, y: 0 });
      expect(project(after, viewport, front)!.x).toBeGreaterThan(project(before, viewport, front)!.x);
    });

    test('dragging down looks from higher, and pitch stops short of the poles', () => {
      expect(orbitBy(camera({ pitch: 20 }), { x: 0, y: 50 }).pitch).toBeGreaterThan(20);
      expect(orbitBy(camera({ pitch: 80 }), { x: 0, y: 10_000 }).pitch).toBeLessThan(90);
      expect(orbitBy(camera({ pitch: -80 }), { x: 0, y: -10_000 }).pitch).toBeGreaterThan(-90);
    });

    test('panning keeps the old target under the pointer', () => {
      for (const projection of ['perspective', 'orthographic'] as const) {
        const before = camera({ yaw: 30, pitch: 25, projection });
        const after = panBy(before, { x: 40, y: -30 }, viewport);
        const moved = project(after, viewport, before.target)!;
        expect(moved.x).toBeCloseTo(400 + 40);
        expect(moved.y).toBeCloseTo(300 - 30);
      }
    });

    test('zooming scales the distance and keeps it positive', () => {
      expect(zoomBy(camera({ distance: 10 }), 0.5).distance).toBeCloseTo(5);
      expect(zoomBy(camera({ distance: 10 }), 0).distance).toBeGreaterThan(0);
    });
  });

  describe('groundPoint', () => {
    const viewport = { width: 800, height: 600 };

    test('is the inverse of project for points on the ground', () => {
      for (const projection of ['perspective', 'orthographic'] as const) {
        const view = camera({ yaw: 25, pitch: 35, projection });
        for (const point of [
          { x: 0, y: 0, z: 0 },
          { x: 1.5, y: 0, z: -2 },
        ]) {
          const screen = project(view, viewport, point);
          const back = screen && groundPoint(view, viewport, screen);
          expect(back?.x).toBeCloseTo(point.x);
          expect(back?.y).toBeCloseTo(0);
          expect(back?.z).toBeCloseTo(point.z);
        }
      }
    });

    test('lands on a raised plane when given its height', () => {
      const view = camera({ yaw: 10, pitch: 40 });
      const point = { x: 1, y: 2, z: 1 };
      const screen = project(view, viewport, point);
      const back = screen && groundPoint(view, viewport, screen, 2);
      expect(back?.x).toBeCloseTo(1);
      expect(back?.z).toBeCloseTo(1);
    });

    test('is undefined when the ray is parallel to the plane or points away from it', () => {
      expect(
        groundPoint(camera({ pitch: 0, projection: 'orthographic' }), viewport, { x: 400, y: 300 }),
      ).toBeUndefined();
      // Looking down from above, a pixel at the top of a steep perspective view still meets the ground; one far above
      // the horizon of a level view does not.
      expect(groundPoint(camera({ pitch: 0 }), viewport, { x: 400, y: 0 })).toBeUndefined();
    });
  });
});
