//
// Copyright 2026 DXOS.org
//

import * as Registry from 'effect/unstable/reactivity/AtomRegistry';
import { describe, test } from 'vitest';

import { createFreehandProjection, reduceIntent } from './projection.ts';
import { createMemoryStore, updateScene } from './store.ts';
import { createSceneTree } from './testing.ts';
import { type Scene, isLink } from './types.ts';

const fixture = (): Scene => {
  const { scenes, root } = createSceneTree(1, 'r');
  const scene = scenes.find((scene) => scene.id === root);
  if (!scene) {
    throw new Error('fixture has no root scene');
  }
  return scene;
};

const centerOf = (scene: Scene, id: string) => {
  const cell = scene.cells[id];
  return cell && cell.kind !== 'link' ? cell.center : undefined;
};

describe('freehand projection', () => {
  test('move shifts the selected cells and skips locked ones', ({ expect }) => {
    const scene = fixture();
    const locked = { ...scene, cells: { ...scene.cells, 'scene:r/b': { ...scene.cells['scene:r/b'], locked: true } } };
    const next = reduceIntent(locked, { kind: 'move', ids: ['scene:r/a', 'scene:r/b'], delta: { x: 10, y: -5 } });
    expect(centerOf(next, 'scene:r/a')).toEqual({ x: 260, y: 195 });
    expect(centerOf(next, 'scene:r/b')).toEqual({ x: 650, y: 160 });
    expect(reduceIntent(scene, { kind: 'move', ids: ['missing'], delta: { x: 1, y: 1 } })).toBe(scene);
  });

  test('resize sets center and size from the bounds', ({ expect }) => {
    const next = reduceIntent(fixture(), {
      kind: 'resize',
      id: 'scene:r/a',
      bounds: { x: 0, y: 0, width: 100, height: 50 },
    });
    const cell = next.cells['scene:r/a'];
    expect(cell.kind === 'rect' && cell.size).toEqual({ width: 100, height: 50 });
    expect(centerOf(next, 'scene:r/a')).toEqual({ x: 50, y: 25 });
  });

  test('link creates a link on top and rejects self-links and unknown ends', ({ expect }) => {
    const scene = fixture();
    const next = reduceIntent(scene, {
      kind: 'link',
      id: 'l',
      source: { cell: 'scene:r/b', port: 'e' },
      target: { cell: 'scene:r/c' },
    });
    const link = next.cells.l;
    if (!link || !isLink(link)) {
      throw new Error('link was not created');
    }
    expect(link.source.port).toBe('e');
    expect(Object.values(next.cells).every((cell) => cell.id === 'l' || cell.z < link.z)).toBe(true);
    expect(
      reduceIntent(scene, { kind: 'link', id: 'x', source: { cell: 'scene:r/a' }, target: { cell: 'scene:r/a' } }),
    ).toBe(scene);
    expect(
      reduceIntent(scene, { kind: 'link', id: 'x', source: { cell: 'scene:r/a' }, target: { cell: 'nope' } }),
    ).toBe(scene);
  });

  test('delete removes cells and the links attached to them', ({ expect }) => {
    const next = reduceIntent(fixture(), { kind: 'delete', ids: ['scene:r/a'] });
    expect(Object.keys(next.cells).sort()).toEqual(['scene:r/b', 'scene:r/c', 'scene:r/t']);
  });

  test('the projection atom re-emits after apply and after an external store write', ({ expect }) => {
    const registry = Registry.make();
    const { scenes, root } = createSceneTree(1, 'r');
    const store = createMemoryStore(scenes);
    const projection = createFreehandProjection({ registry, store, sceneId: root });
    const seen: Scene[] = [];
    const unsubscribe = registry.subscribe(projection.scene, (scene) => seen.push(scene));

    projection.apply({ kind: 'move', ids: ['scene:r/a'], delta: { x: 5, y: 5 } });
    expect(centerOf(registry.get(projection.scene), 'scene:r/a')).toEqual({ x: 255, y: 205 });

    updateScene(registry, store, root, (scene) => reduceIntent(scene, { kind: 'delete', ids: ['scene:r/t'] }));
    expect(registry.get(projection.scene).cells['scene:r/t']).toBeUndefined();
    expect(seen.length).toBe(2);
    unsubscribe();
  });
});
