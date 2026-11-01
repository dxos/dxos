//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { project } from '@dxos/react-ui-canvas/3d';
import { type Resolved3D, type Scene, applyIntent } from '@dxos/scene';

import { extrudeIntent, gizmoIntent } from './gizmo.ts';

const BEFORE: Resolved3D = {
  id: 'a',
  type: 'cube',
  center: { x: 1, y: 0, z: 0 },
  rotation: { x: 0, y: 10, z: 0 },
  scale: { x: 1, y: 2, z: 1 },
};

const SAME = { center: { x: 1, y: 0, z: 0 }, rotation: { x: 0, y: 10, z: 0 }, scale: { x: 1, y: 2, z: 1 } };

describe('gizmoIntent', () => {
  test('a move drag yields move with the center delta', () => {
    expect(gizmoIntent('move', 'a', BEFORE, { ...SAME, center: { x: 1.5, y: 2, z: -1 } })).toEqual({
      kind: 'move',
      ids: ['a'],
      delta: { x: 0.5, y: 2, z: -1 },
    });
  });

  test('a rotate drag yields degrees', () => {
    expect(gizmoIntent('rotate', 'a', BEFORE, { ...SAME, rotation: { x: 0, y: 55, z: 0 } })).toEqual({
      kind: 'rotate',
      ids: ['a'],
      delta: { x: 0, y: 45, z: 0 },
    });
  });

  test('a scale drag sets the scale it ends at', () => {
    expect(gizmoIntent('scale', 'a', BEFORE, { ...SAME, scale: { x: 2, y: 3, z: 1 } })).toEqual({
      kind: 'update',
      id: 'a',
      path: ['scale'],
      value: { x: 2, y: 3, z: 1 },
    });
  });

  test('scaling an element whose object supplies its scale grows it from that scale', () => {
    // The object scales by 2 and the element sets none; the resolved element is what the gizmo started from.
    const before: Resolved3D = { id: 'a', type: 'cube', object: 'box', scale: { x: 2, y: 2, z: 2 } };
    const layout: Scene.LayoutRecord3D = { id: 'l', dim: '3d', elements: { a: { id: 'a', object: 'box' } } };
    const intent = gizmoIntent('scale', 'a', before, { ...SAME, scale: { x: 3, y: 3, z: 3 } });
    expect(intent && applyIntent(layout, intent).elements.a.scale).toEqual({ x: 3, y: 3, z: 3 });
  });

  test('an unchanged transform yields undefined', () => {
    expect(gizmoIntent('move', 'a', BEFORE, SAME)).toBeUndefined();
    expect(gizmoIntent('rotate', 'a', BEFORE, SAME)).toBeUndefined();
    expect(gizmoIntent('scale', 'a', BEFORE, SAME)).toBeUndefined();
  });
});

describe('extrudeIntent', () => {
  const viewport = { width: 800, height: 600 };
  const camera: Scene.Camera3D = {
    target: { x: 0, y: 0, z: 0 },
    yaw: -30,
    pitch: 20,
    distance: 10,
    fov: 0.8,
    projection: 'perspective',
  };
  const point = { x: 0, y: 0.5, z: 0 };
  const up = { x: 0, y: 1, z: 0 };
  // The face's normal as the screen shows it: N pixels along it should be the world length N pixels span at its depth.
  const screenStep = (() => {
    const from = project(camera, viewport, point);
    const to = project(camera, viewport, { x: point.x, y: point.y + 1, z: point.z });
    return from && to ? Math.hypot(to.x - from.x, to.y - from.y) : Number.NaN;
  })();

  test('dragging a face along its normal by N pixels extrudes by the world length of N pixels at that depth', () => {
    const intent = extrudeIntent({ id: 'e', target: 'box', normal: up, dragPixels: 50, camera, viewport, point });
    expect(intent).toMatchObject({ kind: 'extrude', id: 'e', target: 'box', face: up });
    expect(intent?.kind === 'extrude' && intent.distance).toBeCloseTo(50 / screenStep, 2);
  });

  test('dragging against the normal gives a negative distance; a tilted normal snaps to its axis', () => {
    const intent = extrudeIntent({
      id: 'e',
      target: 'box',
      normal: { x: 0.02, y: 0.999, z: -0.01 },
      dragPixels: -50,
      camera,
      viewport,
      point,
    });
    expect(intent).toMatchObject({ face: up });
    expect(intent?.kind === 'extrude' && intent.distance).toBeLessThan(0);
  });

  test('a drag too short to be one makes no intent', () => {
    expect(
      extrudeIntent({ id: 'e', target: 'box', normal: up, dragPixels: 2, camera, viewport, point }),
    ).toBeUndefined();
  });
});
