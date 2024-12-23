//
// Copyright 2024 DXOS.org
//

import { describe, test } from 'vitest';

import { GraphModel } from './graph';

describe('Graph', () => {
  test('empty', ({ expect }) => {
    const { graph } = new GraphModel();
    expect(graph.nodes).to.have.length(0);
    expect(graph.edges).to.have.length(0);
  });
});
