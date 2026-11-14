//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Diagnostics } from '@dxos/diagram';

import { type Box, type BuilderElement, ViewBuilder } from '../builder/index.ts';
import { defaultNodeRegistry } from '../components/index.ts';
import { diagnosticElements, toDiagramObjects } from './diagram.ts';

const box = (x: number, y: number) => ({ x, y, width: 128, height: 64 });
const rect = (id: string, frame: Box, label: string) => ViewBuilder.rect(id, frame).properties({ label });
const build = (elements: BuilderElement[]) => ViewBuilder.view('scene:test', elements).build().views[0];

describe('diagram', () => {
  test('a clean scene has no errors and one connector per link', ({ expect }) => {
    const scene = build([
      rect('scene:test/a', box(0, 0), 'A'),
      rect('scene:test/b', box(256, 0), 'B'),
      ViewBuilder.link('line', 'scene:test/a', 'scene:test/b')
        .id('scene:test/ab')
        .properties({ ends: { end: 'arrow' } }),
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

  test('a diagram connector is measured along its own route, not the one its type would draw', ({ expect }) => {
    const scene = build([
      rect('scene:test/a', box(0, 0), 'A'),
      rect('scene:test/b', box(256, 0), 'B'),
      ViewBuilder.link('ortho', 'scene:test/a', 'scene:test/b').id('scene:test/ab'),
    ]);
    // The ports line up, so an orthogonal link runs straight; the layout's route goes over the top.
    const route = [
      { x: 64, y: 0 },
      { x: 64, y: -48 },
      { x: 320, y: -48 },
      { x: 320, y: 0 },
    ];
    const link = scene.links['scene:test/ab'];
    const routed = { ...scene, links: { ...scene.links, [link.id]: { ...link, connector: { route } } } };
    const { objects } = toDiagramObjects(routed, defaultNodeRegistry);
    const drawn = objects.find((object) => object.id === encodeURIComponent(link.id));
    expect(drawn?.elements).toEqual([{ kind: 'line', id: 'path', points: route }]);
  });

  test('crossing links are counted', ({ expect }) => {
    const scene = build([
      rect('scene:test/a', box(0, 0), 'A'),
      rect('scene:test/b', box(512, 512), 'B'),
      rect('scene:test/c', box(512, 0), 'C'),
      rect('scene:test/d', box(0, 512), 'D'),
      ViewBuilder.link('line', 'scene:test/a', 'scene:test/b'),
      ViewBuilder.link('line', 'scene:test/c', 'scene:test/d'),
    ]);
    const { metrics } = Diagnostics.analyze(toDiagramObjects(scene, defaultNodeRegistry).objects);
    expect(metrics.crossings).toBe(1);
  });
});
