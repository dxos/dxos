//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { ComputeGraphModel } from './model';

describe('graph builder', () => {
  test.only('graph', ({ expect }) => {
    const g1 = ComputeGraphModel.create();
    g1.builder.create('x');

    const g2 = ComputeGraphModel.create();
    g2.builder
      .call((graph) => {
        graph.link({ node: graph.create('a'), property: 'result' }, { node: graph.create('b'), property: 'value' });
      })
      .call((graph) => {
        const b = graph.get('b');
        const c = graph.create('c');
        graph.link({ node: b, property: 'result' }, { node: c, property: 'value' });
      })
      .call((graph) => {
        const c = graph.get('c');
        graph.link({ node: c, property: 'result' }, { node: g1.computeGraph, property: 'value' });
      });

    expect(g2.nodes).to.have.length(4);
    expect(g2.edges).to.have.length(3);

    // TODO(burdon): Util to create composite graph.
    console.log(JSON.stringify(g1, null, 2));
    console.log(JSON.stringify(g2, null, 2));
  });
});
