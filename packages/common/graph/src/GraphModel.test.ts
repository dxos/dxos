//
// Copyright 2024 DXOS.org
//

import { Registry } from '@effect-atom/atom-react';
import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { Trigger } from '@dxos/async';

import * as Graph from './Graph';
import * as GraphModel from './GraphModel';

// Create a registry for tests.
const createRegistry = () => Registry.make();

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

  test('reactive model', async ({ expect }) => {
    const registry = createRegistry();
    const graph = new GraphModel.ReactiveGraphModel(registry);

    const done = new Trigger<Graph.Any>();
    const unsubscribe = graph.subscribe((model, g) => {
      if (g.edges.length === 2) {
        done.wake(g);
      }
    });

    setTimeout(() => {
      graph.addNode({ id: 'node-1' });
      graph.addNode({ id: 'node-2' });
      graph.addNode({ id: 'node-3' });
    });

    setTimeout(() => {
      graph.addEdge({ source: 'node-1', target: 'node-2' });
      graph.addEdge({ source: 'node-2', target: 'node-3' });
    });

    {
      const g = await done.wait();
      expect(g.nodes).to.have.length(3);
      expect(g.edges).to.have.length(2);
    }

    unsubscribe();
  });

  test('reactive model fires immediately with fire option', ({ expect }) => {
    const registry = createRegistry();
    const graph = new GraphModel.ReactiveGraphModel(registry);
    graph.addNode({ id: 'node-1' });

    let callCount = 0;
    let lastNodeCount = 0;

    const unsubscribe = graph.subscribe(
      (model) => {
        callCount++;
        lastNodeCount = model.nodes.length;
      },
      true, // fire immediately
    );

    // Should fire once immediately with fire option.
    expect(callCount).to.eq(1);
    expect(lastNodeCount).to.eq(1);

    unsubscribe();
  });

  test('reactive model tracks node additions', ({ expect }) => {
    const registry = createRegistry();
    const graph = new GraphModel.ReactiveGraphModel(registry);

    const nodeCountHistory: number[] = [];
    const unsubscribe = graph.subscribe((model) => {
      nodeCountHistory.push(model.nodes.length);
    });

    graph.addNode({ id: 'node-1' });
    graph.addNode({ id: 'node-2' });
    graph.addNode({ id: 'node-3' });

    // Should have tracked the additions synchronously.
    expect(nodeCountHistory).to.deep.eq([1, 2, 3]);

    unsubscribe();
  });

  test('reactive model tracks node removals', ({ expect }) => {
    const registry = createRegistry();
    const graph = new GraphModel.ReactiveGraphModel(registry);
    graph.addNode({ id: 'node-1' });
    graph.addNode({ id: 'node-2' });
    graph.addNode({ id: 'node-3' });

    const nodeCountHistory: number[] = [];
    const unsubscribe = graph.subscribe((model) => {
      nodeCountHistory.push(model.nodes.length);
    }, true);

    expect(nodeCountHistory[0]).to.eq(3);

    graph.removeNode('node-2');

    expect(nodeCountHistory[nodeCountHistory.length - 1]).to.eq(2);

    unsubscribe();
  });

  test('reactive model unsubscribe stops notifications', ({ expect }) => {
    const registry = createRegistry();
    const graph = new GraphModel.ReactiveGraphModel(registry);

    let callCount = 0;
    const unsubscribe = graph.subscribe(() => {
      callCount++;
    });

    graph.addNode({ id: 'node-1' });

    const countAfterFirstAdd = callCount;
    expect(countAfterFirstAdd).to.eq(1);

    unsubscribe();

    graph.addNode({ id: 'node-2' });

    // Should not have received more notifications after unsubscribe.
    expect(callCount).to.eq(countAfterFirstAdd);
  });

  test('reactive model supports multiple subscribers', ({ expect }) => {
    const registry = createRegistry();
    const graph = new GraphModel.ReactiveGraphModel(registry);

    let subscriber1Count = 0;
    let subscriber2Count = 0;

    const unsub1 = graph.subscribe(() => {
      subscriber1Count++;
    });

    const unsub2 = graph.subscribe(() => {
      subscriber2Count++;
    });

    graph.addNode({ id: 'node-1' });

    expect(subscriber1Count).to.eq(1);
    expect(subscriber2Count).to.eq(1);

    unsub1();
    unsub2();
  });

  test('optional', ({ expect }) => {
    {
      const graph = new GraphModel.GraphModel<Graph.Node.Node<string>>();
      const node = graph.addNode({ id: 'test', data: 'test' });
      expect(node.data.length).to.eq(4);
    }

    {
      const graph = new GraphModel.GraphModel<Graph.Node.Any>();
      const node = graph.addNode({ id: 'test' });
      expect(node.data?.length).to.be.undefined;
    }
  });

  test('add and remove subgraphs', ({ expect }) => {
    const graph = new GraphModel.GraphModel<Graph.Node.Node<TestData>>();
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
