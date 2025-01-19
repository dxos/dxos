//
// Copyright 2024 DXOS.org
//

import { describe, test } from 'vitest';

import { GraphModel } from './model';
import { type GraphNode } from './types';

type TestData = { value: string };

describe('Graph', () => {
  test('empty', ({ expect }) => {
    const graph = new GraphModel();
    expect(graph.nodes).to.have.length(0);
    expect(graph.edges).to.have.length(0);
    expect(graph.toJSON()).to.deep.eq({ nodes: [], edges: [] });
  });

  test('optional', ({ expect }) => {
    {
      const graph = new GraphModel<GraphNode<string>>();
      graph.addNode({ id: 'test', data: 'test' });
      expect(graph.getNode('test').data.length).to.eq(4);
    }

    {
      const graph = new GraphModel<GraphNode.Optional<string>>();
      graph.addNode({ id: 'test' });
      expect(graph.getNode('test').data?.length).to.be.undefined;
    }
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

    const node = graph.findNode('node2');
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
      .addNode({ id: 'a' })
      .addNode({ id: 'b' })
      .addNode({ id: 'c' })
      .addNode({ id: 'd' })
      .addNode({ id: 'e' })
      .addNode({ id: 'f' })
      .addNode({ id: 'g' })
      .addNode({ id: 'h' })
      // Sub-graph 1.
      .addEdge({ source: 'a', target: 'b' })
      .addEdge({ source: 'a', target: 'c' })
      .addEdge({ source: 'c', target: 'd' })
      .addEdge({ source: 'd', target: 'e' })
      .addEdge({ source: 'd', target: 'a' })
      // Sub-graph 2.
      .addEdge({ source: 'f', target: 'g' })
      .addEdge({ source: 'g', target: 'h' });

    const count = graph.nodes.length;

    {
      // Sub-graph 1.
      const nodes = graph.traverse(graph.getNode('a'));
      expect(nodes).to.have.length(5);
    }

    {
      // Sub-graph 2.
      const nodes = graph.traverse(graph.getNode('f'));
      expect(nodes).to.have.length(3);

      // Remove sub-graph.
      graph.removeNodes(nodes.map((node) => node.id));
      expect(graph.nodes).to.have.length(count - 3);
    }
  });
});
