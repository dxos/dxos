//
// Copyright 2026 DXOS.org
//

import * as Registry from 'effect/unstable/reactivity/AtomRegistry';
import { describe, test } from 'vitest';

import { createSceneTree } from '../utils/testing.ts';
import { createFreehandProjection, reduceIntent } from './projection.ts';
import { createMemoryStore, updateScene } from './store.ts';
import { type Scene } from './types.ts';

const fixture = (): Scene => {
  const { scenes, root } = createSceneTree(1, 'r');
  const scene = scenes.find((scene) => scene.id === root);
  if (!scene) {
    throw new Error('fixture has no root scene');
  }
  return scene;
};

const centerOf = (scene: Scene, id: string) => scene.nodes[id]?.center;

describe('freehand projection', () => {
  test('move shifts the selected nodes and skips locked ones', ({ expect }) => {
    const scene = fixture();
    const locked = { ...scene, nodes: { ...scene.nodes, 'scene:r/b': { ...scene.nodes['scene:r/b'], locked: true } } };
    const next = reduceIntent(locked, { kind: 'move', ids: ['scene:r/a', 'scene:r/b'], delta: { x: 10, y: -5 } });
    expect(centerOf(next, 'scene:r/a')).toEqual({ x: 266, y: 187 });
    expect(centerOf(next, 'scene:r/b')).toEqual({ x: 704, y: 192 });
    expect(reduceIntent(scene, { kind: 'move', ids: ['missing'], delta: { x: 1, y: 1 } })).toBe(scene);
  });

  test('resize writes the size of a box and the radii of an ellipse', ({ expect }) => {
    const bounds = { x: 0, y: 0, width: 100, height: 50 };
    const rect = reduceIntent(fixture(), { kind: 'resize', id: 'scene:r/a', bounds }).nodes['scene:r/a'];
    expect(rect.type === 'rect' && rect.size).toEqual({ width: 100, height: 50 });
    expect(rect.center).toEqual({ x: 50, y: 25 });
    const ellipse = reduceIntent(fixture(), { kind: 'resize', id: 'scene:r/b', bounds }).nodes['scene:r/b'];
    expect(ellipse.type === 'ellipse' && [ellipse.rx, ellipse.ry]).toEqual([50, 25]);
    expect(ellipse.center).toEqual({ x: 50, y: 25 });
  });

  test('link adds a typed link and rejects self-links and unknown ends', ({ expect }) => {
    const scene = fixture();
    const link = (id: string, source: string, target: string) =>
      ({
        type: 'spline',
        id,
        z: 'z',
        source: { node: source, port: 'e' },
        target: { node: target },
        points: [],
      }) as const;
    const next = reduceIntent(scene, { kind: 'link', link: link('l', 'scene:r/b', 'scene:r/c') });
    expect(next.links.l?.type).toBe('spline');
    expect(next.links.l?.source.port).toBe('e');
    expect(reduceIntent(scene, { kind: 'link', link: link('x', 'scene:r/a', 'scene:r/a') })).toBe(scene);
    expect(reduceIntent(scene, { kind: 'link', link: link('x', 'scene:r/a', 'nope') })).toBe(scene);
  });

  test('update merges properties of nodes and links but never the id or type', ({ expect }) => {
    const next = reduceIntent(fixture(), {
      kind: 'update',
      id: 'scene:r/a',
      values: { id: 'other', label: 'Renamed', center: { x: 1, y: 2 } },
    });
    const node = next.nodes['scene:r/a'];
    expect(node.type).toBe('rect');
    expect(node.type === 'rect' && node.label).toBe('Renamed');
    expect(node.center).toEqual({ x: 1, y: 2 });
    expect(next.nodes.other).toBeUndefined();

    const points = [
      { x: 1, y: 1 },
      { x: 2, y: 2 },
    ];
    const spline = reduceIntent(fixture(), { kind: 'update', id: 'scene:r/bc', values: { points } }).links[
      'scene:r/bc'
    ];
    expect(spline.type === 'spline' && spline.points).toEqual(points);
  });

  test('delete removes nodes, links and the links attached to deleted nodes', ({ expect }) => {
    const next = reduceIntent(fixture(), { kind: 'delete', ids: ['scene:r/a', 'scene:r/bc'] });
    expect(Object.keys(next.nodes).sort()).toEqual(['scene:r/b', 'scene:r/c', 'scene:r/t']);
    expect(Object.keys(next.links)).toEqual([]);
  });

  test('the projection atom re-emits after apply and after an external store write', ({ expect }) => {
    const registry = Registry.make();
    const { scenes, root } = createSceneTree(1, 'r');
    const store = createMemoryStore(scenes);
    const projection = createFreehandProjection({ registry, store, sceneId: root });
    const seen: Scene[] = [];
    const unsubscribe = registry.subscribe(projection.scene, (scene) => seen.push(scene));

    projection.apply({ kind: 'move', ids: ['scene:r/a'], delta: { x: 5, y: 5 } });
    expect(centerOf(registry.get(projection.scene), 'scene:r/a')).toEqual({ x: 261, y: 197 });

    updateScene(registry, store, root, (scene) => reduceIntent(scene, { kind: 'delete', ids: ['scene:r/t'] }));
    expect(registry.get(projection.scene).nodes['scene:r/t']).toBeUndefined();
    expect(seen.length).toBe(2);
    unsubscribe();
  });
});
