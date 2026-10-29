//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { fromEcho, toEcho } from './echo.ts';
import type * as Scene from './Scene.ts';

const camera: Scene.Camera2D = { center: { x: 0, y: 0 }, zoom: 1 };

const document: Scene.SceneDocument = {
  scenes: [
    {
      id: 'root',
      dim: '2d',
      name: 'Links',
      camera,
      elements: {
        a: { id: 'a', kind: 'rect', center: { x: 0, y: 0 }, size: { width: 100, height: 60 } },
        b: { id: 'b', kind: 'scene', scene: 'b-detail', center: { x: 200, y: 0 }, size: { width: 160, height: 100 } },
        ab: { id: 'ab', kind: 'link', from: { element: 'a' }, to: { element: 'b' } },
      },
    },
    {
      id: 'b-detail',
      dim: '2d',
      camera,
      elements: { x: { id: 'x', kind: 'ellipse', center: { x: 0, y: 0 }, size: { width: 40, height: 40 } } },
    },
  ],
};

const shell = (id: string, child: string): Scene.Element2D => ({
  id,
  kind: 'scene',
  scene: child,
  center: { x: 0, y: 0 },
});

describe('echo', () => {
  test('a cycle keeps the scene id of the element that closes it', () => {
    const cyclic: Scene.SceneDocument = {
      scenes: [
        { id: 'a', dim: '2d', camera, elements: { 'to-b': shell('to-b', 'b') } },
        { id: 'b', dim: '2d', camera, elements: { 'to-a': shell('to-a', 'a') } },
      ],
    };
    expect(fromEcho(toEcho(cyclic).root)).toEqual(cyclic);
  });

  test('stores scenes the root does not reach', () => {
    const doc: Scene.SceneDocument = {
      scenes: [...document.scenes, { id: 'loose', dim: '2d', camera, elements: {} }],
    };
    expect(toEcho(doc).scenes.has('loose')).toBe(true);
  });

  test('toEcho then fromEcho returns the same document', () => {
    const { root, scenes } = toEcho(document);
    expect(scenes.size).toBe(2);
    expect(root.key).toBe('root');
    expect(fromEcho(root)).toEqual(document);
  });
});
