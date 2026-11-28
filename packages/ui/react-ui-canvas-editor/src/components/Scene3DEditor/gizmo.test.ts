//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { project } from '@dxos/react-ui-canvas/3d';
import { type Resolved3D, type Scene, applyIntent } from '@dxos/scene';

import { extrudeIntent, gizmoIntent } from './gizmo.ts';

const BEFORE: Resolved3D = {
  id: 'a',
  kind: 'cube',
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
    const before: Resolved3D = { id: 'a', kind: 'cube', object: 'box', scale: { x: 2, y: 2, z: 2 } };
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
  /** The pixels a drag covers to take the face `units` along its normal: how far the screen shows the point moving. */
  const pixelsFor = (units: number, view = camera) => {
    const from = project(view, viewport, point);
    const to = project(view, viewport, { x: point.x, y: point.y + units, z: point.z });
    return from && to ? Math.sign(units) * Math.hypot(to.x - from.x, to.y - from.y) : Number.NaN;
  };

  test('dragging a face along its normal puts it under the pointer, near the camera and far from it', () => {
    const intent = extrudeIntent({
      ...{ id: 'e', target: 'box', normal: up, camera, viewport, point },
      dragPixels: 50,
    });
    expect(intent).toMatchObject({ kind: 'extrude', id: 'e', target: 'box', face: up });
    // Seen from above the face comes at the camera as it rises, so a world unit covers more pixels the further it goes.
    const above: Scene.Camera3D = { ...camera, pitch: 70 };
    expect(pixelsFor(4, above)).toBeGreaterThan(1.2 * 4 * pixelsFor(1, above));
    for (const view of [camera, above, { ...above, projection: 'orthographic' as const }]) {
      for (const units of [0.5, 2, 4, -1.5]) {
        const dragged = extrudeIntent({
          ...{ id: 'e', target: 'box', normal: up, camera: view, viewport, point },
          dragPixels: pixelsFor(units, view),
        });
        expect(dragged?.kind === 'extrude' && dragged.distance).toBeCloseTo(units, 2);
      }
    }
  });

  test('a drag past the point the normal vanishes at takes the face as far as it goes, not back', () => {
    // Looking along the ground, a face pushed away from the camera closes on a point of the screen it never passes.
    const along: Scene.Camera3D = { ...camera, yaw: 0, pitch: 5 };
    const away = { x: 0, y: 0, z: 1 };
    const far = (pixels: number, step = 0, more: Partial<Parameters<typeof extrudeIntent>[0]> = {}) => {
      const intent = extrudeIntent({
        ...{ id: 'e', target: 'box', normal: away, camera: along, viewport, point, step, landing: step > 0 },
        ...{ dragPixels: pixels, ...more },
      });
      return intent?.kind === 'extrude' ? intent.distance : undefined;
    };
    const [near, past] = [far(20), far(5_000)];
    expect(Math.sign(past ?? 0)).toBe(Math.sign(near ?? 0));
    expect(Math.abs(past ?? 0)).toBe(100);
    // A landing there is on the last whole step short of that reach, not the nearest one, which is past it.
    expect(Math.abs(far(5_000, 6) ?? 0)).toBe(96);
    // Nor is the face held on another body's side just past the reach, though that is within the detent.
    const boxes = { beyond: { min: { x: -1, y: -1, z: 100.01 }, max: { x: 1, y: 1, z: 110 } } };
    expect(far(5_000, 10, { boxes, side: 0, landing: false })).toBe(100);
  });

  test('an orthographic view has no vanishing point, so a face follows the pointer however far', () => {
    const flat: Scene.Camera3D = { ...camera, projection: 'orthographic' };
    for (const units of [150, -150]) {
      const intent = extrudeIntent({
        ...{ id: 'e', target: 'box', normal: up, camera: flat, viewport, point },
        dragPixels: pixelsFor(units, flat),
      });
      expect(intent?.kind === 'extrude' && intent.distance).toBeCloseTo(units, 2);
    }
  });

  test('pushing a face in leaves at least a minor grid unit of the solid, snapping or not', () => {
    const push = (units: number, step: number, thickness: number, landing = false) => {
      const intent = extrudeIntent({
        ...{ id: 'e', target: 'box', normal: up, camera, viewport, point, step, landing, thickness },
        dragPixels: pixelsFor(units),
      });
      return intent?.kind === 'extrude' ? intent.distance : undefined;
    };
    expect(push(-0.5, 0, 3)).toBeCloseTo(-0.5, 2);
    expect(push(-2.8, 0, 3)).toBeCloseTo(-2.75, 2);
    expect(push(-5, 0, 3)).toBeCloseTo(-2.75, 2);
    expect(push(-5, 0.25, 3, true)).toBe(-2.75);
    // A solid a minor unit thick has nothing to give, so a push in makes nothing.
    expect(push(-0.5, 0, 0.25)).toBeUndefined();
    expect(push(-3, 0.25, 0.25, true)).toBeUndefined();
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

  test('with a step, a landing drag ends on whole steps; under half a step makes no intent', () => {
    const drag = (pixels: number) =>
      extrudeIntent({
        id: 'e',
        target: 'box',
        normal: up,
        dragPixels: pixels,
        camera,
        viewport,
        point,
        step: 0.5,
        landing: true,
      });
    const intent = drag(pixelsFor(1.3));
    expect(intent?.kind === 'extrude' && intent.distance).toBe(1.5);
    expect(drag(pixelsFor(-0.8))).toMatchObject({ distance: -1 });
    expect(drag(pixelsFor(0.2))).toBeUndefined();
  });

  test('with a step, a drag under way follows the pointer, held on a step it passes within the detent', () => {
    const drag = (pixels: number) =>
      extrudeIntent({ id: 'e', target: 'box', normal: up, dragPixels: pixels, camera, viewport, point, step: 1 });
    expect(drag(pixelsFor(1.3))).toMatchObject({ distance: 1.3 });
    expect(drag(pixelsFor(2) - 4)).toMatchObject({ distance: 2 });
  });

  test("a face pulled near another body's side is held flush on it, ahead of the grid; a landing within the detent too", () => {
    // The face is at y 0.5; a body above starts at y 1.6, which the face meets after 1.1.
    const boxes = { above: { min: { x: -1, y: 1.6, z: -1 }, max: { x: 1, y: 2, z: 1 } } };
    const pull = (units: number, landing = false) => {
      const intent = extrudeIntent({
        ...{ id: 'e', target: 'box', normal: up, camera, viewport, point, step: 0.25, landing, boxes, side: 0.5 },
        dragPixels: pixelsFor(units),
      });
      return intent?.kind === 'extrude' ? intent.distance : undefined;
    };
    expect(pull(1.08)).toBeCloseTo(1.1, 3);
    expect(pull(1.08, true)).toBeCloseTo(1.1, 3);
    expect(pull(0.6, true)).toBe(0.5);
  });

  test('a drag too short to be one makes no intent', () => {
    expect(
      extrudeIntent({ id: 'e', target: 'box', normal: up, dragPixels: 2, camera, viewport, point }),
    ).toBeUndefined();
  });
});
