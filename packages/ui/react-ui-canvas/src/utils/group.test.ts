//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { reduceIntent } from '../model/projection.ts';
import { SceneBuilder } from './builder.ts';
import { groupIntoScene } from './group.ts';

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

  test('a selection of links alone groups nothing', ({ expect }) => {
    expect(groupIntoScene(scene, ['ab'], 'g')).toBeUndefined();
  });
});
