//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { compileScript, trackValue } from '@dxos/animation';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import { BASE_ANIMATABLE } from '@dxos/react-ui-canvas/headless';
import { type RectNode } from '@dxos/scene';

import { Canvas } from '#types';

import { seedContent, writeViews } from './content.ts';
import {
  CANVAS_LAYOUTS,
  CANVAS_SCRIPT_PROPERTIES,
  canvasStageBinding,
  canvasStageTargets,
  legacyStageSample,
} from './stage.ts';

const box = (x: number) => ({ z: 'a0', center: { x, y: 0 }, size: { width: 100, height: 50 } });

const makeCanvas = (): Drawing.Canvas => {
  const content = {};
  const root = seedContent(content);
  const a: RectNode = { id: 'a', type: 'rect', label: 'A', ...box(0) };
  const b: RectNode = { id: 'b', type: 'rect', ...box(200), style: { opacity: 0.5 } };
  const link = { id: 'ab', type: 'line' as const, z: 'a1', source: { node: 'a' }, target: { node: 'b' } };
  writeViews(content, { [root]: { id: root, nodes: { a, b }, links: { ab: link } } });
  return Drawing.makeCanvas({ schema: Canvas.SCENE_SCHEMA, content });
};

describe('canvas stage', () => {
  test('the root scene nodes are the targets, with their animatable properties at rest', ({ expect }) => {
    const targets = canvasStageTargets(makeCanvas(), () => BASE_ANIMATABLE);
    expect(targets.map((target) => [target.id, target.label])).toEqual([
      ['a', 'A'],
      ['b', 'b'],
    ]);
    expect(targets[0].properties).toContainEqual({ path: 'center', kind: 'point' });
    expect(targets[0].values).toMatchObject({ 'center': { x: 0, y: 0 }, 'style.opacity': 1 });
    expect(targets[1].values['style.opacity']).toBe(0.5);
  });

  test('effects bind to the sampled nodes and the links between them, as the migrated scene binds them', ({
    expect,
  }) => {
    const binding = canvasStageBinding(makeCanvas(), {
      t: 1,
      values: { a: { center: { x: 40, y: 10 } }, b: { 'style.opacity': 0.25 } },
    });
    expect(binding.objects.a).toEqual({ id: 'a', position: { x: 40, y: 10, z: 0 }, radius: 50, opacity: 1 });
    expect(binding.objects.b.opacity).toBe(0.25);
    expect(binding.links).toEqual([
      { id: 'ab', from: 'a', to: 'b', points: [binding.objects.a.position, binding.objects.b.position] },
    ]);
  });

  test('a canvas of another renderer has no targets', ({ expect }) => {
    expect(canvasStageTargets(Drawing.makeCanvas({ schema: 'tldraw.com/2' }), () => BASE_ANIMATABLE)).toEqual([]);
  });

  test('a sample keyed by node paths keys the migrated elements', ({ expect }) => {
    const sample = { t: 2, values: { a: { 'center': { x: 1, y: 2 }, 'style.opacity': 0.5, 'text': 'T' } } };
    expect(legacyStageSample(sample).values).toEqual({
      a: { 'center': { x: 1, y: 2 }, 'overrides.opacity': 0.5, 'label': 'T' },
    });
  });

  test('a script compiles against the canvas: show writes size and opacity, ring places centres', ({ expect }) => {
    const targets = canvasStageTargets(makeCanvas(), () => BASE_ANIMATABLE);
    const { timeline } = compileScript(
      [
        { duration: 1, show: ['b'] },
        { duration: 1, layout: { kind: 'ring', targets: ['a', 'b'], params: { radius: 50 } } },
      ],
      {
        targets: Object.fromEntries(targets.map((target) => [target.id, target.values])),
        layouts: CANVAS_LAYOUTS,
        properties: CANVAS_SCRIPT_PROPERTIES,
        duration: 2,
      },
    );
    expect(trackValue(timeline.tracks['b:size'], 0)).toEqual({ width: 0, height: 0 });
    expect(trackValue(timeline.tracks['b:style.opacity'], 1)).toBe(0.5);
    expect(trackValue(timeline.tracks['a:center'], 2)).toEqual({ x: 100, y: -50 });
  });
});
