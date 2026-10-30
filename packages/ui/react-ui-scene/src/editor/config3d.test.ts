//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { type LayoutIntent, type ModelIntent, type Scene } from '@dxos/scene';

import { CATALOGS_3D, config3d } from './config3d.tsx';

const CAMERA: Scene.Camera3D = {
  target: { x: 0, y: 0, z: 0 },
  yaw: 0,
  pitch: 30,
  distance: 10,
  fov: 0.8,
  projection: 'perspective',
};

const document: Scene.SceneDocument = {
  scenes: [{ id: 's', dim: '3d', layout: 'root', camera: CAMERA }],
  layouts: [
    {
      id: 'root',
      dim: '3d',
      elements: {
        a: { id: 'a', type: 'cube', center: { x: 10, y: 0, z: 0 } },
        b: { id: 'b', type: 'cube', center: { x: 12, y: 0, z: 0 } },
      },
    },
  ],
  models: [{ id: 'm', dim: '3d', objects: {} }],
};

describe('config3d', () => {
  test('CAD, Presentation and Clay are default style catalogs, and the looks the display panel offers', () => {
    expect(CATALOGS_3D.map((catalog) => catalog.id)).toEqual(['cad', 'presentation', 'clay']);
    expect(config3d.display.themes.map((theme) => theme.id)).toEqual(['cad', 'presentation', 'clay']);
    expect(Object.keys(CATALOGS_3D[1].styles).length).toBeGreaterThan(0);
  });

  test('fit frames the open layout and zoom keeps the angle', () => {
    const fitted = config3d.camera.fit(CAMERA, document, 'root', { width: 800, height: 600 });
    expect(fitted.target.x).toBeCloseTo(11);
    expect(fitted.yaw).toBe(CAMERA.yaw);
    expect(config3d.camera.zoom(CAMERA, 2).distance).toBeCloseTo(20);
    expect(config3d.camera.percent(config3d.camera.zoom(CAMERA, 0.5), CAMERA)).toBe(200);
  });

  test('a paste lands a grid unit further along each ground axis, and gizmos snap to unit, 15° and a tenth', () => {
    expect(config3d.geometry.pasteOffset(2)).toEqual({ x: 2, y: 0, z: 2 });
    expect(config3d.geometry.snap).toEqual({ move: 1, rotate: 15, scale: 0.1 });
  });

  test('Join makes one element of the selection and selects it; Subtract needs exactly two', () => {
    const intents: LayoutIntent[] = [];
    let selected: readonly string[] = [];
    const join = config3d.commands?.find((command) => command.id === 'join');
    const subtract = config3d.commands?.find((command) => command.id === 'subtract');
    expect(join?.enabled({ selection: ['a', 'b'], readonly: false })).toBe(true);
    expect(subtract?.enabled({ selection: ['a'], readonly: false })).toBe(false);
    void join?.run({
      document,
      layout: 'root',
      selection: ['a', 'b'],
      onIntent: (_layout, intent) => intents.push(intent),
      onModelIntent: (_intent: ModelIntent) => [],
      select: (ids) => (selected = ids),
      setTool: () => {},
      notify: () => {},
    });
    expect(intents).toEqual([{ kind: 'join', id: 'union-1', operands: ['a', 'b'] }]);
    expect(selected).toEqual(['union-1']);
  });

  test('reset keeps the authored view and its distance, looking at the middle of the content', () => {
    const reset = config3d.camera.reset(CAMERA, document, 'root', { width: 800, height: 600 });
    expect(reset).toEqual({ ...CAMERA, target: { x: 11, y: 0, z: 0 } });
  });
});
