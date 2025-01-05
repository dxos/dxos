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
    const graph = new GraphModel();
    expect(graph.nodes).to.have.length(0);
    expect(graph.edges).to.have.length(0);
    expect(graph.toJSON()).to.deep.eq({ nodes: [], edges: [] });
  });

  test('add and remove subgraphs', ({ expect }) => {
    const graph = new GraphModel<GraphNode<TestData>>()
      .addNode({ id: 'node1', data: { value: 'test' } })
      .addNode({ id: 'node2', data: { value: 'test' } })
      .addNode({ id: 'node3', data: { value: 'test' } })
      .addEdge({
        id: createEdgeId({ source: 'node1', target: 'node2', relation: 'test' }),
        source: 'node1',
        target: 'node2',
      })
      .addEdge({
        id: createEdgeId({ source: 'node2', target: 'node3', relation: 'test' }),
        source: 'node2',
        target: 'node3',
      });
    expect(graph.nodes).to.have.length(3);
    expect(graph.edges).to.have.length(2);
    const pre = graph.toJSON();

    const node: GraphNode<TestData> = graph.getNode('node2')!;
    expect(node).to.exist;

    const removed = graph.removeNode('node2');
    expect(removed.nodes).to.have.length(1);
    expect(removed.edges).to.have.length(2);
    expect(graph.nodes).to.have.length(2);
    expect(graph.edges).to.have.length(0);

    graph.addGraph(removed);
    const post = graph.toJSON();
    expect(pre).to.deep.eq(post);

    graph.clear();
    expect(graph.nodes).to.have.length(0);
    expect(graph.edges).to.have.length(0);
  });
});
