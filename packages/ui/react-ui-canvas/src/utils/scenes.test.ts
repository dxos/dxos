//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type FrameNode } from '../model/types.ts';
import { SceneBuilder } from './builder.ts';
import { compoundTree, frameCount, sceneOptions } from './scenes.ts';

describe('sceneOptions', () => {
  const box = (x: number) => ({ x, y: 0, width: 200, height: 100 });
  const { scenes: list } = SceneBuilder.scene('root', [
    SceneBuilder.scene('a', [SceneBuilder.scene('x').at(box(0)).properties({ label: 'Inner' })])
      .name('A')
      .at(box(0)),
    SceneBuilder.scene('b').name('B').at(box(300)),
  ]).build();
  const scenes = Object.fromEntries(list.map((scene) => [scene.id, scene]));

  test('lists every scene a shape may open, named or by the label of a shape that opens it', ({ expect }) => {
    expect(sceneOptions(scenes, ['root'])).toEqual([
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B' },
      { value: 'x', label: 'Inner' },
    ]);
  });

  test('never offers a scene that would open the path again', ({ expect }) => {
    // Inside `a`: neither `a` nor the root, which opens `a`, may be opened from it; `b` and `x` may.
    expect(sceneOptions(scenes, ['root', 'a']).map((option) => option.value)).toEqual(['b', 'x']);
    // Inside `x`: `a` opens `x`, so it is out too.
    expect(sceneOptions(scenes, ['root', 'a', 'x']).map((option) => option.value)).toEqual(['b']);
  });

  test('a host narrows the candidates', ({ expect }) => {
    expect(sceneOptions(scenes, ['root'], (id) => id !== 'x').map((option) => option.value)).toEqual(['a', 'b']);
  });
});

describe('compoundTree', () => {
  const box = (x: number) => ({ x, y: 0, width: 200, height: 100 });
  const { scenes: list } = SceneBuilder.scene('root', [
    SceneBuilder.scene('a', [SceneBuilder.scene('x').at(box(0)).properties({ label: 'Inner' })])
      .name('A')
      .at(box(0)),
    SceneBuilder.scene('b').name('B').at(box(300)),
  ]).build();
  const scenes = Object.fromEntries(list.map((scene) => [scene.id, scene]));

  test('lists the compound objects as a tree, addressed by their frame path', ({ expect }) => {
    const tree = compoundTree(scenes, 'root');
    expect(tree.map((entry) => entry.name).sort()).toEqual(['A', 'B']);
    const a = tree.find((entry) => entry.name === 'A');
    expect(a?.children.map((entry) => [entry.name, entry.path])).toEqual([
      ['Inner', [a?.frame.id, a?.children[0].frame.id]],
    ]);
    expect(a?.children[0].scenePath).toEqual(['root', 'a']);
  });

  test('a frame that opens a scene on its own path is listed but not followed', ({ expect }) => {
    const loop: FrameNode = {
      type: 'frame',
      id: 'loop',
      z: 'a',
      center: { x: 0, y: 0 },
      size: { width: 100, height: 100 },
      scene: 'root',
    };
    const cyclic = { ...scenes, x: { ...scenes.x, nodes: { loop } } };
    const inner = compoundTree(cyclic, 'root').find((entry) => entry.name === 'A')?.children[0];
    expect(inner?.children.map((entry) => entry.child)).toEqual(['root']);
    expect(inner?.children[0].children).toEqual([]);
  });

  test('counts the frames that open a scene', ({ expect }) => {
    expect(frameCount(scenes, 'a')).toBe(1);
    expect(frameCount(scenes, 'root')).toBe(0);
  });
});
