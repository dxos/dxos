//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Diagnostics } from '@dxos/diagram';

import { defaultNodeRegistry } from '../model/registry.ts';
import { SceneBuilder } from './builder.ts';
import { diagnosticElements, toDiagramObjects } from './diagram.ts';

const box = (x: number, y: number) => ({ x, y, width: 128, height: 64 });

describe('diagram', () => {
  test('a clean scene has no errors and one connector per link', ({ expect }) => {
    const scene = SceneBuilder.create('scene:test')
      .rect('scene:test/a', box(0, 0), 'A')
      .rect('scene:test/b', box(256, 0), 'B')
      .line('scene:test/ab', 'scene:test/a', 'scene:test/b', { directed: true })
      .build();
    const { metrics, diagnostics } = Diagnostics.analyze(toDiagramObjects(scene, defaultNodeRegistry).objects);
    expect(metrics.nodes).toBe(2);
    expect(metrics.connectors).toBe(1);
    expect(diagnostics).toEqual([]);
  });

  test('overlapping nodes map back to their scene ids', ({ expect }) => {
    const scene = SceneBuilder.create('scene:test')
      .rect('scene:test/a', box(0, 0), 'A')
      .rect('scene:test/b', box(64, 32), 'B')
      .build();
    const converted = toDiagramObjects(scene, defaultNodeRegistry);
    const [overlap] = Diagnostics.errors(Diagnostics.analyze(converted.objects));
    expect(overlap.code).toBe('node-overlap');
    expect(diagnosticElements(converted, overlap.refs).sort()).toEqual(['scene:test/a', 'scene:test/b']);
  });

  test('ids that differ only in separators stay distinct objects', ({ expect }) => {
    const scene = SceneBuilder.create('scene:test')
      .rect('scene/a', box(0, 0), 'A')
      .rect('scene_a', box(64, 32), 'B')
      .build();
    const converted = toDiagramObjects(scene, defaultNodeRegistry);
    const [overlap] = Diagnostics.errors(Diagnostics.analyze(converted.objects));
    expect(overlap.code).toBe('node-overlap');
    expect(diagnosticElements(converted, overlap.refs).sort()).toEqual(['scene/a', 'scene_a']);
  });

  test('crossing links are counted', ({ expect }) => {
    const scene = SceneBuilder.create('scene:test')
      .rect('scene:test/a', box(0, 0), 'A')
      .rect('scene:test/b', box(512, 512), 'B')
      .rect('scene:test/c', box(512, 0), 'C')
      .rect('scene:test/d', box(0, 512), 'D')
      .line('scene:test/ab', 'scene:test/a', 'scene:test/b')
      .line('scene:test/cd', 'scene:test/c', 'scene:test/d')
      .build();
    const { metrics } = Diagnostics.analyze(toDiagramObjects(scene, defaultNodeRegistry).objects);
    expect(metrics.crossings).toBe(1);
  });
});
