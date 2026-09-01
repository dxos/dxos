//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { FLOWCHART, projectMermaid } from '../testing/index.ts';
import { type Graph, type Node } from '../types/index.ts';
import { GRID, layout } from './layout.ts';

const resolve = (source = FLOWCHART): Map<string, Node> => {
  const { graph } = projectMermaid(source);
  return new Map(layout(graph).nodes.map((node) => [node.id, node]));
};

describe('layout', () => {
  test('ranks by flow direction, lifting edges that cross a group boundary', ({ expect }) => {
    const nodes = resolve();

    // `X --> A` reaches into CORE, so it must rank X above the group. Without lifting, the root
    // level sees no edges at all and X / CORE / Y collapse into one row.
    expect(nodes.get('X')!.origin!.y).toBeLessThan(nodes.get('CORE')!.origin!.y);
    expect(nodes.get('CORE')!.origin!.y).toBeLessThan(nodes.get('Y')!.origin!.y);
  });

  test('`Y --> C` is a back edge and does not push C below Y', ({ expect }) => {
    const nodes = resolve();

    expect(nodes.get('A')!.origin!.y).toBeLessThan(nodes.get('B')!.origin!.y);
    expect(nodes.get('B')!.origin!.y).toBe(nodes.get('C')!.origin!.y);
  });

  test('children are inset inside their group and coordinates are parent-relative', ({ expect }) => {
    const nodes = resolve();
    const core = nodes.get('CORE')!;

    for (const id of ['A', 'B', 'C']) {
      const child = nodes.get(id)!;
      // Parent-relative, so an inset child is strictly positive rather than near the group's own x/y.
      expect(child.origin!.x).toBeGreaterThan(0);
      expect(child.origin!.y).toBeGreaterThan(0);
    }

    // The group is sized to contain its children.
    const widest = Math.max(...['A', 'B', 'C'].map((id) => nodes.get(id)!.origin!.x + nodes.get(id)!.size!.width));
    const lowest = Math.max(...['A', 'B', 'C'].map((id) => nodes.get(id)!.origin!.y + nodes.get(id)!.size!.height));
    expect(core.size!.width).toBeGreaterThanOrEqual(widest);
    expect(core.size!.height).toBeGreaterThanOrEqual(lowest);
  });

  test('snaps computed origins and group sizes to the grid', ({ expect }) => {
    // Centring a narrow lane inside a wider one is what produces off-grid values.
    for (const node of resolve().values()) {
      expect(node.origin!.x % GRID).toBe(0);
      expect(node.origin!.y % GRID).toBe(0);
      expect(node.size!.width % GRID).toBe(0);
      expect(node.size!.height % GRID).toBe(0);
    }
  });

  test('honours a custom grid pitch for both position and group size', ({ expect }) => {
    const { graph } = projectMermaid(FLOWCHART);
    const resolved = layout(graph, { grid: 25 });

    for (const node of resolved.nodes) {
      expect(node.origin!.x % 25).toBe(0);
      expect(node.origin!.y % 25).toBe(0);
    }

    // Only a group is sized by layout; leaf sizes come from the model and are left alone.
    const core = resolved.nodes.find((node) => node.id === 'CORE')!;
    expect(core.size!.width % 25).toBe(0);
    expect(core.size!.height % 25).toBe(0);
  });

  test('pinned positions from the overlay win over computed ones', ({ expect }) => {
    const { graph } = projectMermaid(FLOWCHART);
    const pinned = { x: 999, y: 777 };
    const resolved = layout(graph, { overlay: { positions: { X: pinned } } });

    expect(resolved.nodes.find((node) => node.id === 'X')!.origin).toEqual(pinned);
    // Unpinned nodes are still laid out.
    expect(resolved.nodes.find((node) => node.id === 'Y')!.origin).not.toEqual(pinned);
  });

  test('terminates on a graph that is entirely a cycle', ({ expect }) => {
    const graph: Graph = {
      nodes: [
        { id: 'A', type: 'node' },
        { id: 'B', type: 'node' },
      ],
      edges: [
        { id: 'A->B', type: 'link', source: 'A', target: 'B' },
        { id: 'B->A', type: 'link', source: 'B', target: 'A' },
      ],
    };

    const resolved = layout(graph);
    expect(resolved.nodes.every((node) => node.origin !== undefined)).toBe(true);
  });

  test('a self-referencing parent does not hang the ancestor walk', ({ expect }) => {
    const graph: Graph = {
      nodes: [{ id: 'A', type: 'group', parent: 'A' }],
      edges: [],
    };

    // `A` is unreachable from the root level, so it is simply not placed — but layout returns.
    expect(() => layout(graph)).not.toThrow();
  });
});
