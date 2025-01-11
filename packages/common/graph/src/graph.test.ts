//
// Copyright 2024 DXOS.org
//

import { describe, test } from 'vitest';

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
      .addEdge({ source: 'node1', target: 'node2' })
      .addEdge({ source: 'node2', target: 'node3' });
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

  test('traverse', ({ expect }) => {
    const graph = new GraphModel()
      .addNode({ id: 'node1' })
      .addNode({ id: 'node2' })
      .addNode({ id: 'node3' })
      .addNode({ id: 'node4' })
      .addNode({ id: 'node5' })
      .addNode({ id: 'node6' })
      .addNode({ id: 'node7' })
      .addNode({ id: 'node8' })
      .addEdge({ source: 'node1', target: 'node2' })
      .addEdge({ source: 'node1', target: 'node3' })
      .addEdge({ source: 'node3', target: 'node4' })
      .addEdge({ source: 'node4', target: 'node5' })
      .addEdge({ source: 'node4', target: 'node1' })
      .addEdge({ source: 'node6', target: 'node7' })
      .addEdge({ source: 'node7', target: 'node8' });

    {
      const nodes = graph.traverse(graph.getNode('node1')!);
      expect(nodes).to.have.length(5);
    }

    {
      const nodes = graph.traverse(graph.getNode('node6')!);
      expect(nodes).to.have.length(3);
    }
  });
});
