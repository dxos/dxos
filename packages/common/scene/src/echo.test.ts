//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { fromEcho, readDocument, toEcho } from './echo.ts';
import type * as Scene from './Scene.ts';
import { layout2D, model2D, scene2D } from './testing.ts';

const main = layout2D(
  'main',
  [
    { id: 'a', kind: 'rect', center: { x: 0, y: 0 }, size: { width: 128, height: 128 } },
    { id: 'b', object: 'detail', label: 'B', center: { x: 256, y: 0 }, size: { width: 256, height: 256 } },
    { id: 'ab', kind: 'link', from: { element: 'a' }, to: { element: 'b' } },
  ],
  'parts',
);

const detail = layout2D('b-detail', [
  { id: 'x', kind: 'ellipse', center: { x: 0, y: 0 }, size: { width: 64, height: 64 } },
]);

const parts = model2D('parts', [{ id: 'detail', kind: 'rect', parts: 'b-detail' }]);

// In the order `fromEcho` reaches them: the scene's layout, its model, then the model's parts layouts.
const document: Scene.SceneDocument = {
  scenes: [{ ...scene2D('root', 'main'), name: 'Sub-scene' }],
  layouts: [main, detail],
  models: [parts],
};

describe('echo', () => {
  test('toEcho then fromEcho returns the same document', () => {
    const { root, scenes, layouts, models } = toEcho(document);
    expect([scenes.size, layouts.size, models.size]).toEqual([1, 2, 1]);
    expect(root.key).toBe('root');
    expect(fromEcho(root)).toEqual(document);
  });

  test('a model whose parts lead back to the layout that uses it round-trips', () => {
    const cyclic: Scene.SceneDocument = {
      scenes: [scene2D('s', 'a')],
      layouts: [layout2D('a', [{ id: 'self', object: 'again' }], 'm')],
      models: [model2D('m', [{ id: 'again', kind: 'rect', parts: 'a' }])],
    };
    expect(fromEcho(toEcho(cyclic).root)).toEqual(cyclic);
  });

  test('stores layouts no scene reaches', () => {
    const doc: Scene.SceneDocument = { ...document, layouts: [...document.layouts, layout2D('loose', [])] };
    expect(toEcho(doc).layouts.has('loose')).toBe(true);
  });

  test("keeps a layout's props", () => {
    const doc: Scene.SceneDocument = {
      ...document,
      layouts: [{ ...main, props: { canvas: { layers: { base: { id: 'base', name: 'Base', z: 'a0' } } } } }, detail],
    };
    expect(fromEcho(toEcho(doc).root)).toEqual(doc);
  });

  test('readDocument reads every scene, layout and model given, reached or not', () => {
    const doc: Scene.SceneDocument = {
      scenes: [document.scenes[0], { ...scene2D('zoomed', 'main'), camera: { center: { x: 0, y: 0 }, zoom: 2 } }],
      layouts: [main, detail, layout2D('loose', [])],
      models: [parts],
    };
    const { scenes, layouts, models } = toEcho(doc);
    expect(
      readDocument({ scenes: [...scenes.values()], layouts: [...layouts.values()], models: [...models.values()] }),
    ).toEqual(doc);
  });
});
