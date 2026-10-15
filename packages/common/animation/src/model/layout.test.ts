//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { buildGraph } from './build.ts';
import { type Graph, NODE_RADIUS, getNetwork, getNode } from './graph.ts';
import { type NetworkTemplate } from './template.ts';

const TEMPLATE: NetworkTemplate = {
  networks: [
    {
      id: 'cloud',
      kind: 'cloud',
      layout: { at: [0, 0] },
      generate: { nodes: { type: 'server', count: [6, 6] }, networks: { template: 'region', count: [3, 3], depth: 2 } },
    },
    {
      id: 'home',
      kind: 'devices',
      layout: { near: 'cloud' },
      nodes: [
        { id: 'phone', type: 'phone' },
        { id: 'laptop', type: 'laptop' },
      ],
    },
    ...Array.from({ length: 6 }, (_, index) => ({
      id: `site-${index + 1}`,
      kind: 'devices' as const,
      generate: { nodes: { type: 'phone' as const, count: [1, 3] as const } },
    })),
  ],
  templates: { region: { id: 'region', kind: 'servers', generate: { nodes: { type: 'server', count: [2, 3] } } } },
  links: [
    { rule: 'nearby', k: 1, scope: 'site-*' },
    { rule: 'cloud', scope: '*', ratio: 1 },
    { from: 'home', to: 'site-1' },
  ],
};

const distance = (a: readonly [number, number], b: readonly [number, number]): number =>
  Math.hypot(a[0] - b[0], a[1] - b[1]);

const circlesOf = (graph: Graph, path: string) => {
  const network = getNetwork(graph, path);
  return [
    ...network.nodes.map((node) => ({
      center: getNode(graph, node).position,
      radius: NODE_RADIUS[getNode(graph, node).type],
    })),
    ...network.networks.map((child) => ({
      center: getNetwork(graph, child).center,
      radius: getNetwork(graph, child).radius,
    })),
  ];
};

describe('layout', () => {
  test('children fit inside their parent and never overlap', ({ expect }) => {
    const graph = buildGraph(TEMPLATE, 3);
    expect(graph).toEqual(buildGraph(TEMPLATE, 3));
    for (const network of Object.values(graph.networks)) {
      const circles = circlesOf(graph, network.path);
      for (const circle of circles) {
        expect(distance(circle.center, network.center) + circle.radius).toBeLessThanOrEqual(network.radius + 1e-6);
      }
      circles.forEach((a, i) =>
        circles
          .slice(i + 1)
          .forEach((b) => expect(distance(a.center, b.center)).toBeGreaterThanOrEqual(a.radius + b.radius)),
      );
    }
    const roots = graph.roots.map((path) => getNetwork(graph, path));
    roots.forEach((a, i) =>
      roots
        .slice(i + 1)
        .forEach((b) => expect(distance(a.center, b.center)).toBeGreaterThanOrEqual(a.radius + b.radius)),
    );
  });

  test('pins and "near" placement', ({ expect }) => {
    const graph = buildGraph(TEMPLATE, 3);
    const cloud = getNetwork(graph, 'cloud');
    const home = getNetwork(graph, 'home');
    expect(cloud.center).toEqual([0, 0]);
    expect(distance(home.center, cloud.center)).toBeLessThan(cloud.radius + home.radius + 200);
  });

  test('links', ({ expect }) => {
    const graph = buildGraph(TEMPLATE, 3);
    const keys = graph.links.map((link) => `${link.from}|${link.to}`);
    expect(new Set(keys).size).toBe(keys.length);
    for (const root of graph.roots.filter((path) => path !== 'cloud')) {
      expect(
        graph.links.some(
          (link) => (link.from === root && link.to === 'cloud') || (link.to === root && link.from === 'cloud'),
        ),
      ).toBe(true);
    }
    expect(keys).toContain('home|site-1');
    expect(
      graph.links.filter((link) => link.from.startsWith('site-') && link.to.startsWith('site-')).length,
    ).toBeGreaterThanOrEqual(3);
  });
});

describe('density and spread', () => {
  const servers = (kind: 'servers' | 'devices'): NetworkTemplate => ({
    networks: [{ id: 'n', kind, generate: { nodes: { type: 'server', count: [40, 40] } } }],
  });

  test('server networks pack tighter than device networks', ({ expect }) => {
    const dense = getNetwork(buildGraph(servers('servers'), 1), 'n').radius;
    const loose = getNetwork(buildGraph(servers('devices'), 1), 'n').radius;
    expect(dense).toBeLessThan(loose * 0.85);
  });

  test('spread scatters root networks away from the cloud and each other', ({ expect }) => {
    const sites = Array.from({ length: 12 }, (_, index) => ({
      id: `site-${index + 1}`,
      kind: 'devices' as const,
      nodes: [{ id: 'p', type: 'phone' as const }],
    }));
    const cloud = {
      id: 'cloud',
      kind: 'cloud' as const,
      layout: { at: [0, 0] as const },
      generate: { nodes: { type: 'server' as const, count: [30, 30] as const } },
    };
    const packed = buildGraph({ networks: [cloud, ...sites] }, 2);
    const spread = buildGraph({ networks: [cloud, ...sites], layout: { spread: 8000, gap: 400 } }, 2);
    const mean = (graph: Graph) =>
      sites.reduce((sum, site) => sum + distance(getNetwork(graph, site.id).center, [0, 0]), 0) / sites.length;
    expect(mean(spread)).toBeGreaterThan(mean(packed) + 2000);
    const roots = spread.roots.map((path) => getNetwork(spread, path));
    roots.forEach((a, i) =>
      roots
        .slice(i + 1)
        .forEach((b) => expect(distance(a.center, b.center)).toBeGreaterThanOrEqual(a.radius + b.radius + 400)),
    );
  });
});
