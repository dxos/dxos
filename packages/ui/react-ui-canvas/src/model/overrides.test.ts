//
// Copyright 2026 DXOS.org
//

import * as Atom from 'effect/reactivity/Atom';
import * as Registry from 'effect/reactivity/AtomRegistry';
import { describe, test } from 'vitest';

import { SceneBuilder } from '../utils/builder.ts';
import { DEFAULT_LAYER, visibleScene } from '../utils/layers.ts';
import { type SceneOverrides, applyOverrides, createOverrideStore } from './overrides.ts';
import { createMemoryStore, putScene } from './store.ts';

describe('overrides', () => {
  const box = (x: number) => ({ x, y: 0, width: 100, height: 50 });
  const { scenes } = SceneBuilder.scene('root', [
    SceneBuilder.rect('a', box(0)).properties({ style: { hue: 'red', tone: 1 } }),
    SceneBuilder.rect('b', box(200)),
    SceneBuilder.link('line', 'a', 'b').id('ab'),
    SceneBuilder.scene('child', [SceneBuilder.rect('c', box(0))]).at(box(400)),
  ]).build();
  const [root, child] = scenes;

  test('a scene with no override, or one naming nothing it has, is the same scene', ({ expect }) => {
    expect(applyOverrides(root, undefined)).toBe(root);
    expect(applyOverrides(root, {})).toBe(root);
    expect(applyOverrides(root, { nodes: { missing: { hidden: true } } })).toBe(root);
  });

  test('merges position, visibility and style over the stored values', ({ expect }) => {
    const scene = applyOverrides(root, {
      nodes: { a: { center: { x: 1, y: 2 }, style: { hue: 'blue' } }, b: { hidden: true } },
      links: { ab: { style: { lineStyle: 'dashed' } } },
    });
    expect(scene.nodes.a.center).toEqual({ x: 1, y: 2 });
    expect(scene.nodes.a.style).toEqual({ hue: 'blue', tone: 1 });
    expect(scene.links.ab.style).toEqual({ lineStyle: 'dashed' });
    expect(Object.keys(visibleScene(scene).nodes)).not.toContain('b');
    // The stored scene is untouched.
    expect(root.nodes.a.center).not.toEqual({ x: 1, y: 2 });
  });

  test('hides the implicit layer of a scene that names none', ({ expect }) => {
    const scene = applyOverrides(root, { layers: { [DEFAULT_LAYER.id]: { hidden: true } } });
    expect(scene.layers?.[DEFAULT_LAYER.id]?.hidden).toBe(true);
    expect(Object.keys(visibleScene(scene).nodes)).toEqual([]);
  });

  test('the override store derives every scene, at any depth, and drops writes', ({ expect }) => {
    const registry = Registry.make();
    const base = createMemoryStore(scenes);
    const overrides = Atom.make<SceneOverrides>({});
    const store = createOverrideStore(base, overrides);

    expect(registry.get(store.scene('child'))).toBe(child);
    registry.set(overrides, { child: { nodes: { c: { center: { x: 9, y: 9 } } } } });
    expect(registry.get(store.scene('child'))?.nodes.c.center).toEqual({ x: 9, y: 9 });
    expect(registry.get(store.scenes).child.nodes.c.center).toEqual({ x: 9, y: 9 });
    expect(registry.get(store.scene('root'))).toBe(root);

    // A write to the override store goes nowhere; the base store keeps its scenes.
    putScene(registry, store, { ...root, nodes: {} });
    expect(registry.get(base.scenes).root).toBe(root);
    expect(Object.keys(registry.get(store.scene('root'))?.nodes ?? {})).toHaveLength(Object.keys(root.nodes).length);
  });
});
