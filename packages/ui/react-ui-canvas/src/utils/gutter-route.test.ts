//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { defaultNodeRegistry } from '../model/registry.ts';
import { type Link, type Node, type Scene } from '../model/types.ts';
import { gutterRoute } from './gutter-route.ts';
import { DEFAULT_LATTICE, cellBounds } from './lattice.ts';
import { sceneLinkGeometry } from './route.ts';
import { createLink, createNode } from './shapes.ts';

const spec = DEFAULT_LATTICE;

const cellNode = (id: string, col: number, row: number, spanX = 1, spanY = 1): Node => {
  const { x, y, width, height } = cellBounds({ col, row, spanX, spanY }, spec);
  return createNode({
    type: 'rect',
    id,
    z: id,
    center: { x: x + width / 2, y: y + height / 2 },
    size: { width, height },
  });
};

// The Lattice story's layout: A, B, C down column -1; a free cell above D and E in column 0; F spanning
// rows -1..1 of column 1. Gutter centre lines sit at x = (k + 1/2) x 384 and y = (k + 1/2) x 192.
const nodes = [
  cellNode('a', -1, -1),
  cellNode('b', -1, 0),
  cellNode('c', -1, 1),
  cellNode('d', 0, 0),
  cellNode('e', 0, 1),
  cellNode('f', 1, -1, 1, 3),
];

describe('gutter route', () => {
  test('A south to E north runs through the gutters at right angles', ({ expect }) => {
    const route = gutterRoute(
      nodes,
      spec,
      { point: { x: -384, y: -128 }, side: 's' },
      { point: { x: 0, y: 128 }, side: 'n' },
    );
    expect(route).toEqual([
      // Out of A's south port to the gutter below A, then along it to the column gutter.
      { x: -384, y: -128 },
      { x: -384, y: -96 },
      { x: -192, y: -96 },
      // Down the column gutter between B and D, to the gutter above E, then into E's north port.
      { x: -192, y: 96 },
      { x: 0, y: 96 },
      { x: 0, y: 128 },
    ]);
  });

  test('facing ports across one gutter join straight', ({ expect }) => {
    const route = gutterRoute(
      nodes,
      spec,
      { point: { x: -256, y: 0 }, side: 'e' },
      { point: { x: -128, y: 0 }, side: 'w' },
    );
    expect(route).toEqual([
      { x: -256, y: 0 },
      { x: -128, y: 0 },
    ]);
  });

  test('a gutter a shape spans is not a track', ({ expect }) => {
    // E's east port to F's west port: F covers the row gutters inside its span, so the route stays in the
    // column gutter between them rather than crossing F.
    const route = gutterRoute(
      nodes,
      spec,
      { point: { x: 128, y: 192 }, side: 'e' },
      { point: { x: 256, y: 192 }, side: 'w' },
    );
    expect(route).toEqual([
      { x: 128, y: 192 },
      { x: 256, y: 192 },
    ]);
    for (const point of route ?? []) {
      // Nothing of the route lies inside F (x 256..640, y -256..256).
      expect(point.x > 256 && point.x < 640 && point.y > -256 && point.y < 256).toBe(false);
    }
  });

  test('a route runs straight through free cells', ({ expect }) => {
    // A's east port to F's west side level with it: the cell between them (column 0, row -1) is free.
    const route = gutterRoute(
      nodes,
      spec,
      { point: { x: -256, y: -192 }, side: 'e' },
      { point: { x: 256, y: -192 }, side: 'w' },
    );
    expect(route).toEqual([
      { x: -256, y: -192 },
      { x: 256, y: -192 },
    ]);
  });

  test('a route still detours round an occupied cell', ({ expect }) => {
    // B's east port to F's west side level with it: D sits in between, so the run leaves for a gutter.
    const route = gutterRoute(
      nodes,
      spec,
      { point: { x: -256, y: 0 }, side: 'e' },
      { point: { x: 256, y: 0 }, side: 'w' },
    );
    expect(route?.length).toBeGreaterThan(2);
    for (const point of route ?? []) {
      // Nothing of the route lies inside D (x -128..128, y -64..64).
      expect(point.x > -128 && point.x < 128 && point.y > -64 && point.y < 64).toBe(false);
    }
  });

  test('links sharing a gutter are nudged into separate lanes', ({ expect }) => {
    const scene: Scene = { id: 's', nodes: Object.fromEntries(nodes.map((node) => [node.id, node])), links: {} };
    const link = (id: string, source: string, sourcePort: string, target: string, targetPort: string): Link =>
      createLink({
        type: 'smart',
        id,
        z: id,
        source: { node: source, port: sourcePort },
        target: { node: target, port: targetPort },
      });
    // Both run down the column gutter at x = -192 and along the row gutter at y = 96 into E's north side.
    const links = [link('ae', 'a', 's2', 'e', 'n2'), link('be', 'b', 'e2', 'e', 'n2')];
    const [first, second] = sceneLinkGeometry(scene, defaultNodeRegistry, links, spec).map(({ path }) => path);
    // The vertical runs near the column gutter: each link has its own, a lane apart.
    const verticalX = (path: string) =>
      [...path.matchAll(/L (-?[\d.]+) (-?[\d.]+)/g)]
        .map((match) => Number(match[1]))
        .filter((x) => Math.abs(x + 192) <= 32);
    const lanes = new Set([...verticalX(first), ...verticalX(second)]);
    expect(lanes.size).toBeGreaterThanOrEqual(2);
    expect(first).not.toEqual(second);
  });
});
