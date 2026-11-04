//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { toEcho } from './echo.ts';
import type * as Scene from './Scene.ts';
import { layout2D, model2D, scene2D } from './testing.ts';
import { reachedObjects } from './watch.ts';

const document: Scene.SceneDocument = {
  scenes: [scene2D('root', 'main')],
  layouts: [
    layout2D('main', [{ id: 'b', object: 'detail' }], 'parts'),
    layout2D('b-detail', [{ id: 'x', object: 'inner' }], 'inner-parts'),
    layout2D('deepest', [{ id: 'y', type: 'rect' }]),
    layout2D('loose', []),
  ],
  models: [
    model2D('parts', [
      { id: 'detail', type: 'rect', parts: 'b-detail' },
      { id: 'again', type: 'rect', parts: 'b-detail' },
    ]),
    model2D('inner-parts', [{ id: 'inner', type: 'rect', parts: 'deepest' }]),
  ],
};

describe('reachedObjects', () => {
  test('lists the scene, its layout, its model and every parts layout once', () => {
    const { root, layouts, models } = toEcho(document);
    const reached = reachedObjects(root);
    expect(reached).toEqual([
      root,
      layouts.get('main'),
      models.get('parts'),
      layouts.get('b-detail'),
      models.get('inner-parts'),
      layouts.get('deepest'),
    ]);
  });

  test('a model whose parts lead back to its own layout is listed once', () => {
    const { root } = toEcho({
      scenes: [scene2D('s', 'a')],
      layouts: [layout2D('a', [{ id: 'self', object: 'again' }], 'm')],
      models: [model2D('m', [{ id: 'again', type: 'rect', parts: 'a' }])],
    });
    expect(reachedObjects(root)).toHaveLength(3);
  });
});
