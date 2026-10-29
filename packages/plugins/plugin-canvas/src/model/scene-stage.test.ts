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

  test('3D targets expose position and leave groups and hidden elements out', () => {
    const targets = sceneTargets(read('cluster'));
    expect(targets.find((target) => target.id === 'hub')?.properties).toEqual(
      expect.arrayContaining([{ path: 'position', kind: 'vec3' }]),
    );
    expect(targets.map((target) => target.id)).not.toContain('team');
    expect(sceneTargets(read('solid')).map((target) => target.id)).toEqual(['bracket']);
  });

  test('no target is called camera', () => {
    const doc = read('links');
    const root = doc.scenes[0];
    const withCamera =
      root.dim === '2d'
        ? { scenes: [{ ...root, elements: { ...root.elements, camera: { ...root.elements.a, id: 'camera' } } }] }
        : doc;
    expect(sceneTargets(withCamera).map((target) => target.id)).not.toContain('camera');
  });

  test('applySample patches a nested path and leaves the rest of the style', () => {
    const doc = applySample(read('links'), {
      t: 0,
      values: { a: { 'style.opacity': 0.5, 'center': { x: 10, y: 20 } } },
    });
    const root = doc.scenes[0];
    expect(root.dim === '2d' && root.elements.a).toMatchObject({
      center: { x: 10, y: 20 },
      style: { opacity: 0.5, hue: 'blue', surface: 'solid' },
    });
  });

  test('a 3D binding is plain data the effect worker can be sent', () => {
    const binding = sceneBinding(read('cluster'), { t: 0, values: {} });
    expect(structuredClone(binding)).toEqual(binding);
    expect(binding.objects.hub).toMatchObject({ position: { x: 0, y: 0, z: 0 }, radius: 0.6 });
    expect(binding.links.map((link) => link.id)).toEqual(['l1', 'l2', 'l3', 'l4']);
  });
});
