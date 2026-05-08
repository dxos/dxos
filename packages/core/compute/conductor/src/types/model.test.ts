//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { log } from '@dxos/log';

import { ComputeGraphModel } from './model';

describe('graph builder', () => {
  test('graph', ({ expect }) => {
    const g1 = ComputeGraphModel.create({ id: 'dxn:test:g1' });
    g1.builder.createNode({ id: 'x' });

    const g2 = ComputeGraphModel.create({ id: 'dxn:test:g2' });
    g2.builder
      .call((builder) => {
        builder.createEdge(
          {
            node: builder.model.createNode({ id: 'a' }),
            property: 'result',
          },
          {
            node: builder.model.createNode({ id: 'b' }),
            property: 'value',
          },
        );
      })
      .call((builder) => {
        builder.model.createEdge(
          {
            node: 'b',
            property: 'result',
          },
          {
            node: builder.model.createNode({ id: 'c' }),
            property: 'value',
          },
        );
      })
      .call((builder) => {
        builder.model.createEdge(
          {
            node: 'c',
            property: 'result',
          },
          {
            node: g1.root,
            property: 'value',
          },
        );
      });

    expect(g2.nodes).to.have.length(4);
    expect(g2.edges).to.have.length(3);

    // TODO(burdon): Util to create composite graph.
    log('g1', JSON.stringify(g1, null, 2));
    log('g2', JSON.stringify(g2, null, 2));
  });
});
