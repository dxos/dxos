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

const scene = (id: string, elements: Scene.Element3D[]): Scene.SceneRecord3D => ({
  id,
  dim: '3d',
  camera,
  elements: Object.fromEntries(elements.map((element) => [element.id, element])),
});

describe('renderList', () => {
  test('skips a link whose target is missing', () => {
    const list = renderList({
      scenes: [
        scene('s', [
          { id: 'a', kind: 'sphere', position: { x: 0, y: 0, z: 0 } },
          { id: 'ab', kind: 'link', from: { element: 'a' }, to: { element: 'b' } },
        ]),
      ],
    });
    expect(list.items.map((item) => item.id)).toEqual(['a']);
    expect(list.links).toEqual([]);
  });

  test('stops at a scene cycle', () => {
    const shell = (id: string, child: string): Scene.Element3D => ({
      id,
      kind: 'scene',
      scene: child,
      position: { x: 0, y: 0, z: 0 },
      scale: { x: 4, y: 4, z: 4 },
    });
    const list = renderList({ scenes: [scene('a', [shell('to-b', 'b')]), scene('b', [shell('to-a', 'a')])] });
    expect(list.items.map((item) => item.key)).toEqual(['to-b', 'to-b/to-a']);
  });

  test('places a child scene inside its frame', () => {
    const list = renderList(Dsl.readScenes(EXEMPLARS.encapsulated).document);
    const hub = list.items.find((item) => item.key === 'shell/hub');
    const s1 = list.items.find((item) => item.key === 'shell/s1');
    expect(hub?.position).toEqual({ x: 0, y: 0, z: 0 });
    // The shell is 8 across, so its 80% holds a cluster about 6.6 across: s1 at x=3 lands well inside radius 4.
    expect(s1 && s1.position.x).toBeGreaterThan(0);
    expect(s1 && s1.position.x).toBeLessThan(3.2);
    expect(list.links.map((link) => link.key)).toContain('shell/l1');
  });

  test('leaves hidden elements out', () => {
    const list = renderList(Dsl.readScenes(EXEMPLARS.solid).document);
    expect(list.items.map((item) => item.id)).toEqual(['bracket']);
  });
});
