//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Iri from './Iri.ts';
import * as Model from './Model.ts';
import * as Semantic from './Semantic.ts';

const pkg = (name: string) => `${Iri.PACKAGE}@dxos/${name}`;
const file = (path: string) => `${Iri.FILE}${path}`;

describe('Semantic', () => {
  test('toDsl writes one node per box and one edge per arrow, with relation words', ({ expect }) => {
    const { source, ids } = Semantic.toDsl({
      nodes: [Model.makeNode(pkg('echo')), Model.makeNode(pkg('log'))],
      edges: [{ from: pkg('echo'), to: pkg('log'), kind: 'usesPackage' }],
    });
    expect(source).toContain(`node n0 "@dxos/echo" ref="${pkg('echo')}"`);
    expect(source).toContain('edge n0 depends-on n1');
    expect(ids.get('n1')).toBe(pkg('log'));
  });

  test('frames boxes by package only when grouped, however many packages', ({ expect }) => {
    const graph: Model.Patch = {
      nodes: [
        Model.makeNode(file('packages/common/log/src/index.ts')),
        Model.makeNode(file('packages/common/log/src/log.ts')),
        Model.makeNode(file('packages/common/util/src/index.ts')),
      ],
      edges: [],
    };
    expect(Semantic.toDsl(graph).source).not.toContain('group ');

    const { source, groups } = Semantic.toDsl(graph, { grouped: true });
    expect(source).toMatch(/group g0 "log" color=[a-z-]+ \{\n {2}node n0/);
    expect(source).toMatch(/group g1 "util" color=[a-z-]+ \{/);
    expect(groups.get('g1')).toBe('packages/common/util');

    const many = Array.from({ length: 8 }, (_, index) => Model.makeNode(file(`packages/p${index}/src/index.ts`)));
    expect(Semantic.toDsl({ nodes: many, edges: [] }, { grouped: true }).groups.size).toBe(8);
  });

  test("layout returns a frame per package around its boxes, on the boxes' origin", ({ expect }) => {
    const nodes = [
      Model.makeNode(file('packages/common/log/src/index.ts')),
      Model.makeNode(file('packages/common/log/src/log.ts')),
      Model.makeNode(file('packages/common/util/src/index.ts')),
    ];
    const { positions, frames } = Semantic.layout({ nodes, edges: [] }, { grouped: true });
    expect(frames.map(({ group }) => group).sort()).toEqual(['packages/common/log', 'packages/common/util']);
    for (const node of nodes) {
      const frame = frames.find(({ group }) => group === node.group);
      const point = positions[node.id];
      expect(frame).toBeDefined();
      if (frame) {
        expect(Math.abs(point.x - frame.center.x)).toBeLessThanOrEqual(frame.size.width / 2);
        expect(Math.abs(point.y - frame.center.y)).toBeLessThanOrEqual(frame.size.height / 2);
      }
    }
    expect(Semantic.layout({ nodes, edges: [] }).frames).toEqual([]);
    // Frames keep clear of each other.
    const [left, right] = frames;
    const apartX = Math.abs(left.center.x - right.center.x) - (left.size.width + right.size.width) / 2;
    const apartY = Math.abs(left.center.y - right.center.y) - (left.size.height + right.size.height) / 2;
    expect(Math.max(apartX, apartY)).toBeGreaterThan(0);
  });

  test('a package keeps its colour whatever else is on the graph', ({ expect }) => {
    expect(Semantic.groupColor('packages/core/echo/echo')).toBe(Semantic.groupColor('packages/core/echo/echo'));
    expect(
      new Set(['a', 'b', 'c', 'd', 'e'].map((name) => Semantic.groupColor(`packages/${name}`))).size,
    ).toBeGreaterThan(1);
  });

  test('layout places every box, apart, on the canvas scale', ({ expect }) => {
    const names = ['app', 'echo', 'log', 'util', 'keys'];
    const graph: Model.Patch = {
      nodes: names.map((name) => Model.makeNode(pkg(name))),
      edges: [
        { from: pkg('app'), to: pkg('echo'), kind: 'usesPackage' },
        { from: pkg('echo'), to: pkg('log'), kind: 'usesPackage' },
        { from: pkg('echo'), to: pkg('keys'), kind: 'usesPackage' },
        { from: pkg('log'), to: pkg('util'), kind: 'usesPackage' },
        { from: pkg('keys'), to: pkg('util'), kind: 'usesPackage' },
      ],
    };
    const started = performance.now();
    const { positions, objects } = Semantic.layout(graph);
    const elapsed = performance.now() - started;

    expect(Object.keys(positions).sort()).toEqual(names.map(pkg).sort());
    const points = Object.values(positions);
    for (const [index, left] of points.entries()) {
      for (const right of points.slice(index + 1)) {
        const apart =
          Math.abs(left.x - right.x) >= Semantic.BOX.width || Math.abs(left.y - right.y) >= Semantic.BOX.height;
        expect(apart).toBe(true);
      }
    }
    expect(objects.some((object) => object.ref === pkg('echo'))).toBe(true);
    // Centred on the origin, where the canvas opens.
    const xs = points.map(({ x }) => x);
    const ys = points.map(({ y }) => y);
    expect(Math.min(...xs) + Math.max(...xs)).toBeCloseTo(0);
    expect(Math.min(...ys) + Math.max(...ys)).toBeCloseTo(0);
    // An interactive canvas waits on this; a five-box graph must not take seconds.
    expect(elapsed).toBeLessThan(5_000);
  });
});
