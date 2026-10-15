//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { reduceIntent } from '../model/projection.ts';
import { type Layer, type Scene, endpointNode } from '../model/types.ts';
import { SceneBuilder } from './builder.ts';
import { groupIntoScene, ungroupScene } from './group.ts';
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
      type: 'frame',
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

describe('ungroupScene', () => {
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

  let counter = 0;
  const createId = (prefix: string) => `${prefix}-${++counter}`;

  /** The scene with `a`, `b` and `ab` grouped into `g`, and the child scene. */
  const grouped = (): { parent: Scene; child: Scene } => {
    const group = groupIntoScene(scene, ['a', 'b', 'ab'], 'g');
    if (!group) {
      throw new Error('not grouped');
    }
    return { parent: reduceIntent(scene, { kind: 'batch', intents: group.intents }), child: group.child };
  };

  const ungroup = (parent: Scene, child: Scene, shared = false): Scene => {
    const intents = ungroupScene(parent, 'g', child, { shared, createId });
    if (!intents) {
      throw new Error('not ungrouped');
    }
    return reduceIntent(parent, { kind: 'batch', intents });
  };

  test('ungrouping straight after grouping puts every node back where it was', ({ expect }) => {
    const { parent, child } = grouped();
    const result = ungroup(parent, child);
    expect(Object.keys(result.nodes).sort()).toEqual(['a', 'b', 'c']);
    expect(result.nodes.a.center).toEqual(scene.nodes.a.center);
    expect(result.nodes.b.size).toEqual(scene.nodes.b.size);
    expect(Object.keys(result.links).sort()).toEqual(['ab', 'bc']);
    // The link that crossed out of the group re-attaches to the child node nearest its other end.
    expect(result.links.bc.source).toEqual({ node: 'b' });
  });

  test('a moved frame moves its nodes with it', ({ expect }) => {
    const { parent, child } = grouped();
    const moved = reduceIntent(parent, { kind: 'move', ids: ['g'], delta: { x: 10, y: 20 } });
    const result = ungroup(moved, child);
    expect(result.nodes.a.center).toEqual({ x: 60, y: 45 });
  });

  test('a frame shrunk to half its width shrinks its nodes to fit, centred', ({ expect }) => {
    const { parent, child } = grouped();
    const shrunk = reduceIntent(parent, { kind: 'resize', id: 'g', bounds: { x: 0, y: 0, width: 150, height: 50 } });
    const result = ungroup(shrunk, child);
    expect(result.nodes.a.size).toEqual({ width: 50, height: 25 });
    expect(result.nodes.a.center).toEqual({ x: 25, y: 25 });
    expect(result.nodes.b.center).toEqual({ x: 125, y: 25 });
  });

  test('a frame grown larger than its contents does not magnify them', ({ expect }) => {
    const { parent, child } = grouped();
    const grown = reduceIntent(parent, { kind: 'resize', id: 'g', bounds: { x: 0, y: 0, width: 600, height: 100 } });
    const result = ungroup(grown, child);
    expect(result.nodes.a.size).toEqual({ width: 100, height: 50 });
    expect(result.nodes.a.center).toEqual({ x: 200, y: 50 });
  });

  test('a shared child brings copies with new ids', ({ expect }) => {
    const { parent, child } = grouped();
    const result = ungroup(parent, child, true);
    const ids = Object.keys(result.nodes).filter((id) => id !== 'c');
    expect(ids).toHaveLength(2);
    expect(ids).not.toContain('a');
    const [link] = Object.values(result.links).filter((link) => link.id !== 'bc');
    expect(ids).toContain(endpointNode(link.source));
  });

  test('an id the scene already has is replaced', ({ expect }) => {
    const { parent, child } = grouped();
    const clash = reduceIntent(parent, {
      kind: 'create',
      node: { ...scene.nodes.a, center: { x: 0, y: 500 } },
    });
    const result = ungroup(clash, child);
    expect(result.nodes.a.center).toEqual({ x: 0, y: 500 });
    expect(Object.keys(result.nodes)).toHaveLength(4);
  });

  test('a locked frame, or one opening another scene, is not ungrouped', ({ expect }) => {
    const { parent, child } = grouped();
    const locked = reduceIntent(parent, { kind: 'update', id: 'g', values: { locked: true } });
    expect(ungroupScene(locked, 'g', child, { createId })).toBeUndefined();
    expect(ungroupScene(parent, 'g', { ...child, id: 'other' }, { createId })).toBeUndefined();
    expect(ungroupScene(parent, 'c', child, { createId })).toBeUndefined();
  });
});
