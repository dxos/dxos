//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Dsl } from '@dxos/diagram';
import { EXEMPLARS } from '@dxos/diagram/testing';

import { applySample, sceneBinding, sceneTargets } from './scene-stage.ts';

const read = (name: keyof typeof EXEMPLARS) => Dsl.readScenes(EXEMPLARS[name]).document;

describe('scene stage', () => {
  test('2D targets expose center and size', () => {
    const target = sceneTargets(read('links')).find((candidate) => candidate.id === 'a');
    expect(target?.properties).toEqual(
      expect.arrayContaining([
        { path: 'center', kind: 'point' },
        { path: 'size', kind: 'size' },
        { path: 'style.opacity', kind: 'number' },
      ]),
    );
    expect(target?.values.center).toEqual({ x: 0, y: 0 });
  });

  test('3D targets expose center and leave groups and hidden elements out', () => {
    const targets = sceneTargets(read('cluster'));
    expect(targets.find((target) => target.id === 'hub')?.properties).toEqual(
      expect.arrayContaining([{ path: 'center', kind: 'vec3' }]),
    );
    expect(targets.map((target) => target.id)).not.toContain('team');
    expect(sceneTargets(read('solid')).map((target) => target.id)).toEqual(['bracket']);
  });

  test('no target is called camera', () => {
    const doc = read('links');
    const withCamera = {
      ...doc,
      layouts: doc.layouts.map((layout) =>
        layout.dim === '2d'
          ? { ...layout, elements: { ...layout.elements, camera: { ...layout.elements.a, id: 'camera' } } }
          : layout,
      ),
    };
    expect(sceneTargets(withCamera).map((target) => target.id)).not.toContain('camera');
  });

  test("a target's resting size is its object's when the element sets none", () => {
    const target = sceneTargets(read('links')).find((candidate) => candidate.id === 'b');
    expect(target?.values.size).toEqual({ width: 128, height: 128 });
  });

  test('applySample patches a nested path in a copy and leaves the rest of the style', () => {
    const original = read('links');
    const doc = applySample(original, {
      t: 0,
      values: { a: { 'style.opacity': 0.5, 'center': { x: 10, y: 20 } } },
    });
    const [layout] = doc.layouts;
    expect(layout.dim === '2d' && layout.elements.a).toMatchObject({
      center: { x: 10, y: 20 },
      style: { opacity: 0.5, hue: 'blue' },
    });
    expect(original.layouts[0].elements.a.center).toEqual({ x: 0, y: 0 });
  });

  test('a 3D binding is plain data the effect worker can be sent', () => {
    const binding = sceneBinding(read('cluster'), { t: 0, values: {} });
    expect(structuredClone(binding)).toEqual(binding);
    expect(binding.objects.hub).toMatchObject({ position: { x: 0, y: 0, z: 0 }, radius: 0.6 });
    expect(binding.links.map((link) => link.id)).toEqual(['l1', 'l2', 'l3', 'l4']);
  });
});
