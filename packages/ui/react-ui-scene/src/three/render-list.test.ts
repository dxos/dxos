//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Dsl } from '@dxos/diagram';
import { EXEMPLARS } from '@dxos/diagram/testing';
import { type Scene } from '@dxos/scene';

import { renderList } from './render-list.ts';

const camera: Scene.Camera3D = {
  target: { x: 0, y: 0, z: 0 },
  yaw: 0,
  pitch: 30,
  distance: 10,
  fov: 0.8,
  projection: 'perspective',
};

const layout = (id: string, elements: Scene.Element3D[], model?: string): Scene.LayoutRecord3D => ({
  id,
  dim: '3d',
  ...(model ? { model } : {}),
  elements: Object.fromEntries(elements.map((element) => [element.id, element])),
});

const scene: Scene.SceneRecord3D = { id: 's', dim: '3d', layout: 'a', camera };

describe('renderList', () => {
  test('skips a link whose target is missing', () => {
    const list = renderList({
      scenes: [scene],
      layouts: [
        layout('a', [
          { id: 'a', type: 'sphere', center: { x: 0, y: 0, z: 0 } },
          { id: 'ab', type: 'link', source: { node: 'a' }, target: { node: 'b' } },
        ]),
      ],
      models: [],
    });
    expect(list.items.map((item) => item.id)).toEqual(['a']);
    expect(list.links).toEqual([]);
  });

  test("stops at a cycle through composites' parts", () => {
    const shell = (id: string, object: string): Scene.Element3D => ({
      id,
      object,
      center: { x: 0, y: 0, z: 0 },
      scale: { x: 4, y: 4, z: 4 },
    });
    const list = renderList({
      scenes: [scene],
      layouts: [layout('a', [shell('to-b', 'of-b')], 'm'), layout('b', [shell('to-a', 'of-a')], 'm')],
      models: [
        {
          id: 'm',
          dim: '3d',
          objects: {
            'of-a': { id: 'of-a', type: 'sphere', parts: 'a' },
            'of-b': { id: 'of-b', type: 'sphere', parts: 'b' },
          },
        },
      ],
    });
    expect(list.items.map((item) => item.key)).toEqual(['to-b', 'to-b/to-a']);
    expect(list.items[0]).toMatchObject({ type: 'sphere', frame: true });
  });

  test("overrides replace the scene's own elements' values", () => {
    const list = renderList(
      {
        scenes: [scene],
        layouts: [layout('a', [{ id: 'a', type: 'sphere', center: { x: 0, y: 0, z: 0 } }])],
        models: [],
      },
      scene,
      { a: { center: { x: 1, y: 2, z: 3 } } },
    );
    expect(list.items[0].center).toEqual({ x: 1, y: 2, z: 3 });
  });

  test("places a composite's parts inside its frame", () => {
    const list = renderList(Dsl.readScenes(EXEMPLARS.encapsulated).document);
    const hub = list.items.find((item) => item.key === 'shell/hub');
    const s1 = list.items.find((item) => item.key === 'shell/s1');
    expect(hub?.center).toEqual({ x: 0, y: 0, z: 0 });
    // The shell is 8 across, so its 80% holds a cluster about 6.6 across: s1 at x=3 lands well inside radius 4.
    expect(s1 && s1.center.x).toBeGreaterThan(0);
    expect(s1 && s1.center.x).toBeLessThan(3.2);
    expect(list.links.map((link) => link.key)).toContain('shell/l1');
  });

  test('leaves hidden elements out', () => {
    const list = renderList(Dsl.readScenes(EXEMPLARS.solid).document);
    expect(list.items.map((item) => item.id)).toEqual(['bracket']);
  });
});
