//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { ComputeGraphModel } from './model';

describe('graph builder', () => {
  test('graph', ({ expect }) => {
    const g1 = ComputeGraphModel.create();
    g1.builder.createNode('x');

    const g2 = ComputeGraphModel.create();
    g2.builder
      .call((builder) => {
        builder.linkNodes(
          { node: builder.createNode('a'), property: 'result' },
          { node: builder.createNode('b'), property: 'value' },
        );
      })
      .call((builder) => {
        const b = builder.getNode('b');
        const c = builder.createNode('c');
        builder.linkNodes({ node: b, property: 'result' }, { node: c, property: 'value' });
      })
      .call((builder) => {
        const c = builder.getNode('c');
        builder.linkNodes({ node: c, property: 'result' }, { node: g1.root, property: 'value' });
      });

    expect(g2.nodes).to.have.length(4);
    expect(g2.edges).to.have.length(3);

    // TODO(burdon): Util to create composite graph.
    console.log(JSON.stringify(g1, null, 2));
    console.log(JSON.stringify(g2, null, 2));
  });
});
