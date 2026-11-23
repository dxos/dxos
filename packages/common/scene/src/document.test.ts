//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { resolveLayout2D, resolveLayout3D, sceneLayout } from './document.ts';
import { layout2D, layout3D, model2D, model3D, scene2D } from './testing.ts';

describe('document', () => {
  test('an element placing an object takes its kind, size, style and parts', () => {
    const layout = layout2D(
      'main',
      [{ id: 'b', object: 'box', center: { x: 0, y: 0 }, overrides: { hue: 'green' } }],
      'shapes',
    );
    const model = model2D('shapes', [
      {
        id: 'box',
        type: 'rect',
        size: { width: 128, height: 128 },
        overrides: { hue: 'blue', border: true },
        parts: 'p',
      },
    ]);
    const resolved = resolveLayout2D({ scenes: [], layouts: [layout], models: [model] }, layout).b;
    expect(resolved).toMatchObject({
      type: 'rect',
      size: { width: 128, height: 128 },
      overrides: { hue: 'green', border: true },
      parts: 'p',
    });
  });

  test("an element's own scale wins over its object's", () => {
    const layout = layout3D('l', [{ id: 's', object: 'node', scale: { x: 2, y: 2, z: 2 } }], 'm');
    const model = model3D('m', [{ id: 'node', type: 'sphere', scale: { x: 1, y: 1, z: 1 } }]);
    expect(resolveLayout3D({ scenes: [], layouts: [layout], models: [model] }, layout).s.scale).toEqual({
      x: 2,
      y: 2,
      z: 2,
    });
  });

  test('a layout does not read a model of the other dimension', () => {
    const layout = layout2D('l', [{ id: 'a', object: 'node' }], 'm');
    const model = model3D('m', [{ id: 'node', type: 'sphere' }]);
    expect(resolveLayout2D({ scenes: [], layouts: [layout], models: [model] }, layout).a.type).toBe('');
  });

  test("the root scene's layout is the one of its dimension", () => {
    const doc = { scenes: [scene2D('s', 'l')], layouts: [layout3D('l', [])], models: [] };
    expect(sceneLayout(doc)).toBeUndefined();
  });
});
