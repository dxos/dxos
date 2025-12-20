//
// Copyright 2024 DXOS.org
//

import { effect } from '@preact/signals-core';
import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { Trigger } from '@dxos/async';
import { registerSignalsRuntime } from '@dxos/echo-signals';
import { live } from '@dxos/live-object';

import * as Graph from './Graph';
import * as GraphModel from './GraphModel';

registerSignalsRuntime();

const TestNode = Schema.extend(
  Graph.Node,
  Schema.Struct({
    value: Schema.String,
  }),
);

type TestNode = Schema.Schema.Type<typeof TestNode>;

type TestData = { value: string };

describe('Graph', () => {
  test('empty', ({ expect }) => {
    const graph = new GraphModel.GraphModel();
    expect(graph.nodes).to.have.length(0);
    expect(graph.edges).to.have.length(0);
    expect(graph.toJSON()).to.deep.eq({ nodes: 0, edges: 0 });
  });

  test('extended', ({ expect }) => {
    const graph = new GraphModel.GraphModel<TestNode>();
    const node = graph.addNode({ id: 'test', value: 'test' });
    expect(node.value.length).to.eq(4);
  });

  test('reactive', async ({ expect }) => {
    const graph = new GraphModel.GraphModel(live({ nodes: [], edges: [] }));

    const done = new Trigger<Graph.Graph>();

    // NOTE: Requires `registerSignalsRuntime` to be called.
    const unsubscribe = effect(() => {
      if (graph.edges.length === 2) {
        done.wake(graph.graph);
      }
    });

    setTimeout(() => {
      graph.builder.addNode({ id: 'node-1' });
      graph.builder.addNode({ id: 'node-2' });
      graph.builder.addNode({ id: 'node-3' });
    });

    setTimeout(() => {
      graph.builder.addEdge({ source: 'node-1', target: 'node-2' });
      graph.builder.addEdge({ source: 'node-2', target: 'node-3' });
    });

    {
      const graph = await done.wait();
      expect(graph.nodes).to.have.length(3);
      expect(graph.edges).to.have.length(2);
    }

    unsubscribe();
  });

  test('reactive model', async ({ expect }) => {
    const graph = new GraphModel.ReactiveGraphModel();

    const done = new Trigger<Graph.Graph>();
    const unsubscribe = graph.subscribe((graph) => {
      if (graph.edges.length === 2) {
        done.wake(graph.graph);
      }
    });

    setTimeout(() => {
      graph.builder.addNode({ id: 'node-1' });
      graph.builder.addNode({ id: 'node-2' });
      graph.builder.addNode({ id: 'node-3' });
    });

    setTimeout(() => {
      graph.builder.addEdge({ source: 'node-1', target: 'node-2' });
      graph.builder.addEdge({ source: 'node-2', target: 'node-3' });
    });

    {
      const graph = await done.wait();
      expect(graph.nodes).to.have.length(3);
      expect(graph.edges).to.have.length(2);
    }

    unsubscribe();
  });

  test('optional', ({ expect }) => {
    {
      const graph = new GraphModel.GraphModel<Graph.Node.Required<string>>();
      const node = graph.addNode({ id: 'test', data: 'test' });
      expect(node.data.length).to.eq(4);
    }

    {
      const graph = new GraphModel.GraphModel<Graph.Node.Optional<string>>();
      const node = graph.addNode({ id: 'test' });
      expect(node.data?.length).to.be.undefined;
    }
  });

  test('add and remove subgraphs', ({ expect }) => {
    const graph = new GraphModel.GraphModel<Graph.Node.Required<TestData>>();
    graph.builder
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
    const graph = new GraphModel.GraphModel();
    graph.builder
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
