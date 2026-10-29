//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Obj } from '@dxos/echo';
import { meshProps } from '@dxos/react-ui-scene/io';
import { Scene } from '@dxos/scene';

import * as MeshPresets from './MeshPresets.ts';

describe('MeshPresets', () => {
  test.each(MeshPresets.PRESETS)('the %s preset is a mesh object of its OBJ triangles', (preset) => {
    const object = MeshPresets.make(preset);
    expect(object).toMatchObject({ id: preset, kind: 'mesh' });
    expect(meshProps(object?.props)?.indices.length).toBeGreaterThan(300);
  });

  test('a line-up is a 3D canvas whose layout places each preset once per vehicle, with one object per preset', () => {
    const { canvas, model, layout, scene } = MeshPresets.makeLineup([
      { preset: 'race', label: 'Race car 1', hue: 'blue', x: -3 },
      { preset: 'race', label: 'Race car 2', hue: 'amber', x: -1 },
      { preset: 'firetruck', label: 'Fire truck', hue: 'red', x: 3.25 },
    ]);
    expect(Obj.instanceOf(Scene.Scene3D, scene)).toBe(true);
    expect(canvas.scenes).toHaveLength(1);
    expect(Object.keys(model.objects).sort()).toEqual(['firetruck', 'race']);
    expect(Object.values(layout.elements).map(({ object, label, center }) => [object, label, center?.x])).toEqual([
      ['race', 'Race car 1', -3],
      ['race', 'Race car 2', -1],
      ['firetruck', 'Fire truck', 3.25],
    ]);
  });
});
