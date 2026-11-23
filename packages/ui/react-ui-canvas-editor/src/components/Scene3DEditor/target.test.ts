//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { renderList } from '@dxos/react-ui-canvas/3d';
import { type Scene, applyIntent } from '@dxos/scene';

import { targetOf } from './target.ts';

const CAMERA: Scene.Camera3D = {
  target: { x: 0, y: 0, z: 0 },
  yaw: 0,
  pitch: 30,
  distance: 10,
  fov: 0.8,
  projection: 'perspective',
};

/** Two elements placing one composite object, whose parts hold `b` and `d`. */
const DOC: Scene.SceneDocument = {
  scenes: [{ id: 's', dim: '3d', layout: 'root', camera: CAMERA }],
  layouts: [
    {
      id: 'root',
      dim: '3d',
      model: 'm',
      elements: {
        a: { id: 'a', object: 'team', center: { x: -3, y: 0, z: 0 } },
        c: { id: 'c', object: 'team', center: { x: 3, y: 0, z: 0 } },
      },
    },
    {
      id: 'inside',
      dim: '3d',
      // Two parts, as a frame fits its parts' bounds and would re-centre a lone one wherever it moved.
      elements: {
        b: { id: 'b', type: 'cube', center: { x: 0, y: 0, z: 0 } },
        d: { id: 'd', type: 'cube', center: { x: 2, y: 0, z: 0 } },
      },
    },
  ],
  models: [{ id: 'm', dim: '3d', objects: { team: { id: 'team', type: 'sphere', parts: 'inside' } } }],
};

describe('targetOf', () => {
  test("a top-level key names the scene's layout and the element", () => {
    expect(targetOf(DOC, 's', 'a')).toEqual({ layout: 'root', element: 'a' });
  });

  test('a key inside a composite names the parts layout, and a move there shows in every element placing it', () => {
    const target = targetOf(DOC, 's', 'a/b');
    expect(target).toEqual({ layout: 'inside', element: 'b' });
    const before = renderList(DOC).items;
    const parts = DOC.layouts.find((layout) => layout.id === target?.layout);
    if (parts?.dim !== '3d') {
      throw new Error('The parts layout is 3D.');
    }
    const moved = applyIntent(parts, { kind: 'move', ids: ['b'], delta: { x: 0, y: 1, z: 0 } });
    const after = renderList({
      ...DOC,
      layouts: DOC.layouts.map((layout) => (layout.id === moved.id ? moved : layout)),
    }).items;
    for (const key of ['a/b', 'c/b']) {
      const was = before.find((item) => item.key === key);
      const now = after.find((item) => item.key === key);
      expect(now && was && now.center.y > was.center.y).toBe(true);
    }
  });

  test('a key naming nothing is undefined', () => {
    expect(targetOf(DOC, 's', 'a/missing')).toBeUndefined();
    expect(targetOf(DOC, 's', 'missing')).toBeUndefined();
  });
});
