//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { graphFixture } from '../../testing/graph-fixture.ts';
import { clipEdge, hopsFrom, layoutGraph } from './layout.ts';
import { familyOf, neighbourhood, splitCurie } from './model.ts';

const sizeOf = (_id: string, root: boolean) => (root ? { width: 280, height: 120 } : { width: 200, height: 72 });

describe('layoutGraph', () => {
  test('no two cards overlap, the root sits at the centre, and the layout is deterministic', ({ expect }) => {
    const layout = layoutGraph(graphFixture, { sizeOf });
    const placements = [...layout.placements.values()];
    expect(placements).toHaveLength(graphFixture.nodes.length);
    const root = layout.placements.get(graphFixture.roots[0] ?? '');
    expect(root).toMatchObject({ x: 0, y: 0, root: true, hops: 0 });
    let overlaps = 0;
    for (let i = 0; i < placements.length; i++) {
      for (let j = i + 1; j < placements.length; j++) {
        const a = placements[i];
        const b = placements[j];
        if (
          a &&
          b &&
          Math.abs(a.x - b.x) < (a.width + b.width) / 2 - 1 &&
          Math.abs(a.y - b.y) < (a.height + b.height) / 2 - 1
        ) {
          overlaps++;
        }
      }
    }
    expect(overlaps).toBe(0);
    expect(layoutGraph(graphFixture, { sizeOf }).placements.get(graphFixture.nodes[5]?.id ?? '')).toEqual(
      layout.placements.get(graphFixture.nodes[5]?.id ?? ''),
    );
  });

  test('hops count from the nearest root; an unreached node sits one ring past the furthest', ({ expect }) => {
    const graph = {
      roots: ['a', 'd'],
      nodes: ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id, types: [], label: id, props: {} })),
      edges: [
        { from: 'a', to: 'b', predicate: 'schema:knows' },
        { from: 'b', to: 'c', predicate: 'schema:knows' },
        { from: 'd', to: 'c', predicate: 'schema:knows' },
      ],
      more: {},
    };
    expect(Object.fromEntries(hopsFrom(graph))).toEqual({ a: 0, d: 0, b: 1, c: 1, e: 2 });
  });

  test('an edge is clipped to the borders of the cards it joins', ({ expect }) => {
    const from = { x: 0, y: 0, width: 100, height: 40, hops: 0, root: true };
    const to = { x: 300, y: 0, width: 100, height: 40, hops: 1, root: false };
    expect(clipEdge(from, to)).toEqual({ x1: 52, y1: 0, x2: 244, y2: 0 });
    expect(clipEdge(from, { ...to, x: 50 })).toBeUndefined();
  });
});

describe('graph model', () => {
  test('predicate families and CURIE parts', ({ expect }) => {
    expect(familyOf('schema:worksFor')).toBe('role');
    expect(familyOf('schema:author')).toBe('author');
    expect(familyOf('lh:cites')).toBe('cite');
    expect(familyOf('schema:sameAs')).toBe('same');
    expect(familyOf('schema:programmingLanguage')).toBe('other');
    expect(splitCurie('schema:worksFor')).toEqual({ prefix: 'schema:', name: 'works For' });
  });

  test("a node's 1-hop neighbourhood keeps it and its neighbours", ({ expect }) => {
    const root = graphFixture.roots[0] ?? '';
    const near = neighbourhood(graphFixture, root);
    expect(near.roots).toEqual([root]);
    expect(near.nodes.length).toBeGreaterThan(3);
    const adjacent = new Set(
      graphFixture.edges.flatMap((edge) => (edge.from === root ? [edge.to] : edge.to === root ? [edge.from] : [])),
    );
    expect(near.nodes.every((node) => node.id === root || adjacent.has(node.id))).toBe(true);
  });
});
