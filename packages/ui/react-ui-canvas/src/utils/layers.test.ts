//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { reduceIntent } from '../model/projection.ts';
import { type Layer, type Scene } from '../model/types.ts';
import { SceneBuilder } from './builder.ts';
import {
  DEFAULT_LAYER,
  createLayer,
  elementLayer,
  layerOrder,
  mergeLayersIntent,
  moveLayer,
  sceneLayers,
  visibleScene,
} from './layers.ts';
import { between } from './order.ts';

describe('layers', () => {
  const box = (x: number) => ({ x, y: 0, width: 100, height: 50 });
  const {
    scenes: [base],
  } = SceneBuilder.scene('s', [
    SceneBuilder.rect('a', box(0)),
    SceneBuilder.rect('b', box(200)),
    SceneBuilder.link('line', 'a', 'b').id('ab'),
  ]).build();

  /** The base scene with a second layer above, holding `b`. */
  const layered = (): Scene => {
    const top: Layer = { id: 'top', name: 'Top', z: between(DEFAULT_LAYER.z) };
    const scene = reduceIntent(base, { kind: 'layer', layer: top });
    return reduceIntent(scene, { kind: 'update', id: 'b', values: { layer: 'top' } });
  };

  test('a scene with no layers has one, and every element is on it', ({ expect }) => {
    expect(sceneLayers(base)).toEqual([DEFAULT_LAYER]);
    expect(elementLayer(base.nodes.a, sceneLayers(base))).toBe(DEFAULT_LAYER.id);
  });

  test('a new layer goes below the others', ({ expect }) => {
    const scene = layered();
    const layer = createLayer(scene, 'new');
    const added = reduceIntent(scene, { kind: 'layer', layer });
    expect(layer.name).toBe('Layer 3');
    expect(sceneLayers(added).map((layer) => layer.id)).toEqual(['new', DEFAULT_LAYER.id, 'top']);
  });

  test('a new layer takes a name no other layer has', ({ expect }) => {
    // Two layers, one already named after the count a new one would otherwise take.
    const scene = reduceIntent(layered(), { kind: 'layer', layer: { ...DEFAULT_LAYER, name: 'Layer 3' } });
    expect(createLayer(scene, 'new').name).toBe('Layer 4');
  });

  test('a second layer makes the implicit layer real, so it keeps its elements', ({ expect }) => {
    const scene = layered();
    expect(sceneLayers(scene).map((layer) => layer.id)).toEqual([DEFAULT_LAYER.id, 'top']);
    expect(elementLayer(scene.nodes.a, sceneLayers(scene))).toBe(DEFAULT_LAYER.id);
    expect(elementLayer(scene.nodes.b, sceneLayers(scene))).toBe('top');
  });

  test('nodes paint by layer, then by their own order', ({ expect }) => {
    const scene = layered();
    // `b` is above `a` by layer even with the lower z.
    const lowered = reduceIntent(scene, { kind: 'reorder', id: 'b', z: between(undefined, scene.nodes.a.z) });
    expect(layerOrder(Object.values(lowered.nodes), sceneLayers(lowered)).map((node) => node.id)).toEqual(['a', 'b']);
    // Moving the top layer to the bottom swaps them.
    const moved = moveLayer(lowered, 'top', 0);
    const reordered = moved ? reduceIntent(lowered, { kind: 'layer', layer: moved }) : lowered;
    expect(layerOrder(Object.values(reordered.nodes), sceneLayers(reordered)).map((node) => node.id)).toEqual([
      'b',
      'a',
    ]);
  });

  test('a hidden layer hides its elements and the links to them', ({ expect }) => {
    const scene = layered();
    const top = sceneLayers(scene)[1];
    const hidden = reduceIntent(scene, { kind: 'layer', layer: { ...top, hidden: true } });
    const visible = visibleScene(hidden);
    expect(Object.keys(visible.nodes)).toEqual(['a']);
    expect(Object.keys(visible.links)).toEqual([]);
    expect(visibleScene(scene)).toBe(scene);
  });

  test('removing a layer removes its elements; the last layer stays', ({ expect }) => {
    const scene = reduceIntent(layered(), { kind: 'removeLayer', id: 'top' });
    expect(Object.keys(scene.nodes)).toEqual(['a']);
    expect(Object.keys(scene.links)).toEqual([]);
    expect(reduceIntent(scene, { kind: 'removeLayer', id: DEFAULT_LAYER.id })).toBe(scene);
  });

  test('merging a layer moves its elements onto the other and removes it', ({ expect }) => {
    const scene = layered();
    const merge = mergeLayersIntent(scene, ['top', DEFAULT_LAYER.id], DEFAULT_LAYER.id);
    expect(merge).toBeDefined();
    const merged = merge ? reduceIntent(scene, merge) : scene;
    expect(sceneLayers(merged).map((layer) => layer.id)).toEqual([DEFAULT_LAYER.id]);
    expect(Object.keys(merged.nodes).sort()).toEqual(['a', 'b']);
    expect(Object.keys(merged.links)).toEqual(['ab']);
  });
});
