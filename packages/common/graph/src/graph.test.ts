//
// Copyright 2024 DXOS.org
//

import { describe, test } from 'vitest';

import { createEdgeId } from './buidler';
import { GraphModel } from './graph';
import { type GraphNode } from './types';

type TestData = { value: string };

describe('Graph', () => {
  test('empty', ({ expect }) => {
    const { graph } = new GraphModel();
    expect(graph.nodes).to.have.length(0);
    expect(graph.edges).to.have.length(0);
  });

  test('add and remove', ({ expect }) => {
    const graph = new GraphModel<GraphNode<TestData>>()
      .addNode({ id: 'node-1', data: { value: 'test' } })
      .addNode({ id: 'node-2', data: { value: 'test' } })
      .addNode({ id: 'node-3', data: { value: 'test' } })
      .addEdge({
        id: createEdgeId({ source: 'node-1', target: 'node-2', relation: 'test' }),
        source: 'node-1',
        target: 'node-2',
      })
      .addEdge({
        id: createEdgeId({ source: 'node-2', target: 'node-3', relation: 'test' }),
        source: 'node-2',
        target: 'node-3',
      });
    expect(graph.nodes).to.have.length(3);
    expect(graph.edges).to.have.length(2);

    const node: GraphNode<TestData> = graph.getNode('node-2')!;
    expect(node).to.exist;

    const removed = graph.removeNode('node-2');
    expect(removed.nodes).to.have.length(1);
    expect(removed.edges).to.have.length(2);
    expect(graph.nodes).to.have.length(2);
    expect(graph.edges).to.have.length(0);

    graph.clear();
    expect(graph.nodes).to.have.length(0);
    expect(graph.edges).to.have.length(0);
  });
});
