//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { DEFAULT_SCRIPT_PROPERTIES, compileScript, trackValue } from '@dxos/animation';
import { Dsl } from '@dxos/diagram';
import { EXEMPLARS } from '@dxos/diagram/testing';
import { type Scene } from '@dxos/scene';

import { sceneTargets } from '../../model/scene-stage.ts';
import { canvasStage2D, canvasStage3D } from './definition.ts';

const read = (name: keyof typeof EXEMPLARS) => Dsl.readScenes(EXEMPLARS[name]).document;

const box = (id: string, x: number, opacity?: number): Scene.Element2D => ({
  id,
  type: 'rect',
  z: 'a0',
  center: { x, y: 0 },
  size: { width: 100, height: 50 },
  ...(opacity === undefined ? {} : { overrides: { opacity } }),
});

/** Two boxes, `b` half transparent, in a 2D scene's root layout. */
const pair: Scene.SceneDocument = {
  scenes: [{ id: 'scene', dim: '2d', layout: 'layout', camera: { center: { x: 0, y: 0 }, zoom: 1 } }],
  layouts: [{ id: 'layout', dim: '2d', elements: { a: box('a', 0), b: box('b', 200, 0.5) } }],
  models: [],
};

describe('canvas stage definitions', () => {
  test.each([
    ['2d', canvasStage2D, 'links', 'a'],
    ['3d', canvasStage3D, 'cluster', 'hub'],
  ] as const)('every property a %s script writes is a keyable path', (_dim, stage, exemplar, id) => {
    const paths = sceneTargets(read(exemplar))
      .find((target) => target.id === id)
      ?.properties.map((property) => property.path);
    const written = Object.values({ ...DEFAULT_SCRIPT_PROPERTIES, ...stage.scriptProperties });
    expect(paths).toEqual(expect.arrayContaining(written));
  });

  test('a 2D script: show writes size and opacity, ring places centres', () => {
    const targets = sceneTargets(pair);
    const { timeline } = compileScript(
      [
        { duration: 1, show: ['b'] },
        { duration: 1, layout: { kind: 'ring', targets: ['a', 'b'], params: { radius: 50 } } },
      ],
      {
        targets: Object.fromEntries(targets.map((target) => [target.id, target.values])),
        layouts: canvasStage2D.layouts ?? {},
        properties: { ...DEFAULT_SCRIPT_PROPERTIES, ...canvasStage2D.scriptProperties },
        duration: 2,
      },
    );
    expect(trackValue(timeline.tracks['b:size'], 0)).toEqual({ width: 0, height: 0 });
    expect(trackValue(timeline.tracks['b:overrides.opacity'], 1)).toBe(0.5);
    expect(trackValue(timeline.tracks['a:center'], 2)).toEqual({ x: 100, y: -50 });
  });
});
