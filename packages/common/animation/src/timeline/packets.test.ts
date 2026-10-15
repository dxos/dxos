//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type NetworkTemplate, buildGraph } from '../model/index.ts';
import { compile } from './compile.ts';
import { findRoute, networkAdjacency, packetPath } from './route.ts';

const TEMPLATE: NetworkTemplate = {
  networks: [
    {
      id: 'a',
      kind: 'devices',
      nodes: [
        { id: 'p1', type: 'phone' },
        { id: 'p2', type: 'phone' },
      ],
    },
    { id: 'b', kind: 'devices', nodes: [{ id: 'l1', type: 'laptop' }] },
    { id: 'c', kind: 'cloud', networks: [{ id: 'r', kind: 'servers', nodes: [{ id: 's1', type: 'server' }] }] },
    { id: 'island', kind: 'devices', nodes: [{ id: 'p', type: 'phone' }] },
  ],
  links: [
    { from: 'a', to: 'b' },
    { from: 'b', to: 'c' },
  ],
};

const flow = (...steps: string[]) => ['flow T-1', '  seed: 2', '  steps:', ...steps].join('\n');

describe('routes', () => {
  test('breadth-first over links and nesting', ({ expect }) => {
    const graph = buildGraph(TEMPLATE, 1);
    const adjacency = networkAdjacency(graph);
    expect(findRoute(adjacency, 'a', 'c/r')).toEqual(['a', 'b', 'c', 'c/r']);
    expect(findRoute(adjacency, 'a', 'a')).toEqual(['a']);
    expect(findRoute(adjacency, 'a', 'island')).toBeUndefined();
  });

  test('a packet path leaves through rims', ({ expect }) => {
    const graph = buildGraph(TEMPLATE, 1);
    const source = graph.nodes['a/p1'];
    const target = graph.nodes['c/r/s1'];
    if (!source || !target) {
      throw new Error('missing nodes');
    }
    const points = packetPath(graph, source, target, ['a', 'b', 'c', 'c/r']);
    expect(points[0]).toEqual(source.position);
    expect(points[points.length - 1]).toEqual(target.position);
    expect(points.length).toBe(2 + 2 + 2 + 1);
  });
});

describe('compilePackets', () => {
  test('send by count and rate', ({ expect }) => {
    const { timeline, diagnostics } = compile(
      flow(
        '    - name: s',
        '      send: [{ from: a/p1, to: b/l1, count: 3, speed: 1000 }, { from: a, to: "c/**", rate: 2/s, until: 2s }]',
        '      hold: 4s',
      ),
      TEMPLATE,
    );
    expect(diagnostics).toEqual([]);
    const counted = timeline.packets.filter((packet) => packet.id.startsWith('0.s0.'));
    expect(counted.map((packet) => packet.spawn)).toEqual([0, 1000, 2000]);
    expect(counted.every((packet) => packet.from === 'a/p1' && packet.to === 'b/l1')).toBe(true);
    const rated = timeline.packets.filter((packet) => packet.id.startsWith('0.s1.'));
    expect(rated.map((packet) => packet.spawn)).toEqual([0, 500, 1000, 1500]);
    expect(rated.every((packet) => packet.to === 'c/r/s1')).toBe(true);
    expect(timeline.maxTravel).toBeGreaterThan(0);
    const again = compile(
      flow(
        '    - name: s',
        '      send: [{ from: a/p1, to: b/l1, count: 3, speed: 1000 }, { from: a, to: "c/**", rate: 2/s, until: 2s }]',
        '      hold: 4s',
      ),
      TEMPLATE,
    );
    expect(again.timeline.packets).toEqual(timeline.packets);
  });

  test('traffic stays deterministic and reachable', ({ expect }) => {
    const { timeline } = compile(
      flow('    - name: t', '      traffic: { scope: "a, b", rate: 5/s }', '      hold: 2s'),
      TEMPLATE,
    );
    expect(timeline.packets.length).toBeGreaterThan(0);
    expect(timeline.packets.every((packet) => packet.from !== packet.to)).toBe(true);
  });

  test('unreachable targets warn once', ({ expect }) => {
    const { timeline, diagnostics } = compile(
      flow('    - name: s', '      send: { from: a/p1, to: island/p, count: 4 }', '      hold: 1s'),
      TEMPLATE,
    );
    expect(timeline.packets).toEqual([]);
    expect(diagnostics).toEqual([{ severity: 'warning', message: 'No route from "a/p1" to "island/p"', step: 's' }]);
  });

  test('selectors with no nodes are errors', ({ expect }) => {
    const { diagnostics } = compile(flow('    - name: s', '      send: { from: nowhere, to: b, count: 1 }'), TEMPLATE);
    expect(diagnostics).toEqual([{ severity: 'error', message: '"nowhere" matches no nodes', step: 's' }]);
  });
});
