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

  test('frames boxes by package when there are a few packages', ({ expect }) => {
    const { source } = Semantic.toDsl({
      nodes: [
        Model.makeNode(file('packages/common/log/src/index.ts')),
        Model.makeNode(file('packages/common/log/src/log.ts')),
        Model.makeNode(file('packages/common/util/src/index.ts')),
      ],
      edges: [],
    });
    expect(source).toMatch(/group g0 "log" \{\n {2}node n0/);
    expect(source).toMatch(/group g1 "util" \{/);
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
    // An interactive canvas waits on this; a five-box graph must not take seconds.
    expect(elapsed).toBeLessThan(5_000);
  });
});
