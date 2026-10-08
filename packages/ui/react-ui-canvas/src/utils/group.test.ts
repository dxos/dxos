//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { reduceIntent } from '../model/projection.ts';
import { type Layer } from '../model/types.ts';
import { SceneBuilder } from './builder.ts';
import { groupIntoScene } from './group.ts';
import { DEFAULT_LAYER } from './layers.ts';
import { between } from './order.ts';

describe('groupIntoScene', () => {
  const box = (x: number) => ({ x, y: 0, width: 100, height: 50 });
  const {
    scenes: [scene],
  } = SceneBuilder.scene('s', [
    SceneBuilder.rect('a', box(0)),
    SceneBuilder.rect('b', box(200)),
    SceneBuilder.rect('c', box(400)),
    SceneBuilder.link('line', 'a', 'b').id('ab'),
    SceneBuilder.link('line', 'b', 'c').id('bc'),
  ]).build();

  test('the selection moves into a scene that a shape over its bounds opens', ({ expect }) => {
    const group = groupIntoScene(scene, ['a', 'b', 'ab'], 'g');
    expect(group).toBeDefined();
    if (!group) {
      return;
    }
    expect(Object.keys(group.child.nodes)).toEqual(['a', 'b']);
    expect(Object.keys(group.child.links)).toEqual(['ab']);

    const parent = reduceIntent(scene, { kind: 'batch', intents: group.intents });
    expect(Object.keys(parent.nodes).sort()).toEqual(['c', 'g']);
    expect(parent.nodes.g).toMatchObject({
      type: 'scene',
      scene: 'g',
      center: { x: 150, y: 25 },
      size: { width: 300, height: 50 },
    });
    // The link out of the group stays, now from the shape.
    expect(Object.keys(parent.links)).toEqual(['bc']);
    expect(parent.links.bc.source).toEqual({ node: 'g' });
  });

  test('the shape goes on the given layer, and the new scene keeps the layers its elements were on', ({ expect }) => {
    const top: Layer = { id: 'top', name: 'Top', z: between(DEFAULT_LAYER.z) };
    const layered = reduceIntent(reduceIntent(scene, { kind: 'layer', layer: top }), {
      kind: 'update',
      id: 'b',
      values: { layer: 'top' },
    });
    const group = groupIntoScene(layered, ['a', 'b', 'ab'], 'g', 'top');
    expect(group?.intents[0]).toMatchObject({ kind: 'create', node: { id: 'g', layer: 'top' } });
    expect(group?.child.layers).toEqual({ [DEFAULT_LAYER.id]: DEFAULT_LAYER, top });
    expect([group?.child.nodes.a.layer, group?.child.nodes.b.layer]).toEqual([DEFAULT_LAYER.id, 'top']);
  });

  test('a selection of links alone groups nothing', ({ expect }) => {
    expect(groupIntoScene(scene, ['ab'], 'g')).toBeUndefined();
  });

  test('a selection holding a locked node is not grouped', ({ expect }) => {
    const locked = { ...scene, nodes: { ...scene.nodes, a: { ...scene.nodes.a, locked: true } } };
    expect(groupIntoScene(locked, ['a', 'b'], 'g')).toBeUndefined();
  });
});
