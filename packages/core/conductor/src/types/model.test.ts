//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { ComputeGraphModel } from './model';

describe('graph builder', () => {
  test('graph', ({ expect }) => {
    const g1 = ComputeGraphModel.create();
    g1.builder2.create('x');

    const g2 = ComputeGraphModel.create();
    g2.builder2
      .call((builder) => {
        builder.link(
          { node: builder.create('a'), property: 'result' },
          { node: builder.create('b'), property: 'value' },
        );
      })
      .call((builder) => {
        const b = builder.get('b');
        const c = builder.create('c');
        builder.link({ node: b, property: 'result' }, { node: c, property: 'value' });
      })
      .call((builder) => {
        const c = builder.get('c');
        builder.link({ node: c, property: 'result' }, { node: g1.root, property: 'value' });
      });

    expect(g2.nodes).to.have.length(4);
    expect(g2.edges).to.have.length(3);

    // TODO(burdon): Util to create composite graph.
    console.log(JSON.stringify(g1, null, 2));
    console.log(JSON.stringify(g2, null, 2));
  });
});
