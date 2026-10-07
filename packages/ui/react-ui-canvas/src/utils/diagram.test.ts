//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Diagnostics } from '@dxos/diagram';

import { defaultNodeRegistry } from '../model/registry.ts';
import { type Box, type BuilderElement, SceneBuilder } from './builder.ts';
import { diagnosticElements, toDiagramObjects } from './diagram.ts';

const box = (x: number, y: number) => ({ x, y, width: 128, height: 64 });
const rect = (id: string, frame: Box, label: string) => SceneBuilder.rect(id, frame).properties({ label });
const build = (elements: BuilderElement[]) => SceneBuilder.scene('scene:test', elements).build().scenes[0];

describe('diagram', () => {
  test('a clean scene has no errors and one connector per link', ({ expect }) => {
    const scene = build([
      rect('scene:test/a', box(0, 0), 'A'),
      rect('scene:test/b', box(256, 0), 'B'),
      SceneBuilder.link('line', 'scene:test/a', 'scene:test/b').id('scene:test/ab').properties({ directed: true }),
    ]);
    const { metrics, diagnostics } = Diagnostics.analyze(toDiagramObjects(scene, defaultNodeRegistry).objects);
    expect(metrics.nodes).toBe(2);
    expect(metrics.connectors).toBe(1);
    expect(diagnostics).toEqual([]);
  });

  test('overlapping nodes map back to their scene ids', ({ expect }) => {
    const scene = build([rect('scene:test/a', box(0, 0), 'A'), rect('scene:test/b', box(64, 32), 'B')]);
    const converted = toDiagramObjects(scene, defaultNodeRegistry);
    const [overlap] = Diagnostics.errors(Diagnostics.analyze(converted.objects));
    expect(overlap.code).toBe('node-overlap');
    expect(diagnosticElements(converted, overlap.refs).sort()).toEqual(['scene:test/a', 'scene:test/b']);
  });

  test('ids that differ only in separators stay distinct objects', ({ expect }) => {
    const scene = build([rect('scene/a', box(0, 0), 'A'), rect('scene_a', box(64, 32), 'B')]);
    const converted = toDiagramObjects(scene, defaultNodeRegistry);
    const [overlap] = Diagnostics.errors(Diagnostics.analyze(converted.objects));
    expect(overlap.code).toBe('node-overlap');
    expect(diagnosticElements(converted, overlap.refs).sort()).toEqual(['scene/a', 'scene_a']);
  });

  test('crossing links are counted', ({ expect }) => {
    const scene = build([
      rect('scene:test/a', box(0, 0), 'A'),
      rect('scene:test/b', box(512, 512), 'B'),
      rect('scene:test/c', box(512, 0), 'C'),
      rect('scene:test/d', box(0, 512), 'D'),
      SceneBuilder.link('line', 'scene:test/a', 'scene:test/b'),
      SceneBuilder.link('line', 'scene:test/c', 'scene:test/d'),
    ]);
    const { metrics } = Diagnostics.analyze(toDiagramObjects(scene, defaultNodeRegistry).objects);
    expect(metrics.crossings).toBe(1);
  });
});
