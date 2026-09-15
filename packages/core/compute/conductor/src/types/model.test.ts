//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { log } from '@dxos/log';

import { ComputeGraphModel } from './model.ts';

describe('graph builder', () => {
  test('graph', ({ expect }) => {
    const g1 = ComputeGraphModel.create({ id: 'dxn:test:g1' });
    g1.createNode({ id: 'x' });

    const g2 = ComputeGraphModel.create({ id: 'dxn:test:g2' });
    g2.createEdge(
      { node: g2.createNode({ id: 'a' }), property: 'result' },
      { node: g2.createNode({ id: 'b' }), property: 'value' },
    );
    g2.createEdge({ node: 'b', property: 'result' }, { node: g2.createNode({ id: 'c' }), property: 'value' });
    g2.createEdge({ node: 'c', property: 'result' }, { node: g1.root, property: 'value' });

    expect(g2.nodes).to.have.length(4);
    expect(g2.edges).to.have.length(3);

    // TODO(burdon): Util to create composite graph.
    log('g1', JSON.stringify(g1, null, 2));
    log('g2', JSON.stringify(g2, null, 2));
  });
});
