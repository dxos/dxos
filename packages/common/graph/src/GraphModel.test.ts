//
// Copyright 2024 DXOS.org
//

import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';
import * as Registry from 'effect/unstable/reactivity/AtomRegistry';
import { describe, test } from 'vitest';

import { Trigger } from '@dxos/async';

import * as GraphModel from './GraphModel.ts';
import * as GraphNode from './GraphNode.ts';

const TestNode = GraphNode.GraphNode.mapFields(Struct.assign({ value: Schema.String }));

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
    const registry = Registry.make();
    const graph = new GraphModel.GraphModel({ registry });

    const done = new Trigger<GraphModel.AnyData>();
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
    const registry = Registry.make();
    const graph = new GraphModel.GraphModel({ registry });
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
    const registry = Registry.make();
    const graph = new GraphModel.GraphModel({ registry });

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
    const registry = Registry.make();
    const graph = new GraphModel.GraphModel({ registry });
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
    const registry = Registry.make();
    const graph = new GraphModel.GraphModel({ registry });

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
    const registry = Registry.make();
    const graph = new GraphModel.GraphModel({ registry });

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
      const graph = new GraphModel.GraphModel<GraphNode.Of<string>>();
      const node = graph.addNode({ id: 'test', data: 'test' });
      expect(node.data.length).to.eq(4);
    }

    {
      const graph = new GraphModel.GraphModel<GraphNode.Any>();
      const node = graph.addNode({ id: 'test' });
      expect(node.data?.length).to.be.undefined;
    }
  });

  test('add and remove subgraphs', ({ expect }) => {
    const graph = new GraphModel.GraphModel<GraphNode.Of<TestData>>();
    graph.pipe(
      GraphModel.addNode({ id: 'node1', data: { value: 'test' } }),
      GraphModel.addNode({ id: 'node2', data: { value: 'test' } }),
      GraphModel.addNode({ id: 'node3', data: { value: 'test' } }),
      GraphModel.addEdge({ source: 'node1', target: 'node2' }),
      GraphModel.addEdge({ source: 'node2', target: 'node3' }),
    );
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
    graph.pipe(
      GraphModel.addNode({ id: 'a' }),
      GraphModel.addNode({ id: 'b' }),
      GraphModel.addNode({ id: 'c' }),
      GraphModel.addNode({ id: 'd' }),
      GraphModel.addNode({ id: 'e' }),
      GraphModel.addNode({ id: 'f' }),
      GraphModel.addNode({ id: 'g' }),
      GraphModel.addNode({ id: 'h' }),
      GraphModel.addEdge({ source: 'a', target: 'b' }),
      GraphModel.addEdge({ source: 'a', target: 'c' }),
      GraphModel.addEdge({ source: 'c', target: 'd' }),
      GraphModel.addEdge({ source: 'd', target: 'e' }),
      GraphModel.addEdge({ source: 'd', target: 'a' }),
      GraphModel.addEdge({ source: 'f', target: 'g' }),
      GraphModel.addEdge({ source: 'g', target: 'h' }),
    );

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
  test('batch emits a single notification', ({ expect }) => {
    const registry = Registry.make();
    const graph = new GraphModel.GraphModel({ registry });

    let count = 0;
    const unsubscribe = graph.subscribe(() => {
      count++;
    });

    graph.batch(() => {
      graph.addNode({ id: 'node-1' });
      graph.addNode({ id: 'node-2' });
      graph.addEdge({ source: 'node-1', target: 'node-2' });
    });

    expect(count).to.eq(1);
    expect(graph.nodes).to.have.length(2);
    unsubscribe();
  });

  test('node atoms recompute only for the model version', ({ expect }) => {
    const registry = Registry.make();
    const graph = new GraphModel.GraphModel<TestNode>({ registry });
    graph.addNode({ id: 'node-1', value: 'one' });
    graph.addNode({ id: 'node-2', value: 'two' });

    const atom = graph.nodeAtom('node-1');
    expect(registry.get(atom)?.value).to.eq('one');
    expect(graph.nodeAtom('node-1')).to.eq(atom);

    graph.removeNode('node-1');
    expect(registry.get(atom)).to.be.undefined;
  });

  test('edges may precede their endpoints', ({ expect }) => {
    const graph = new GraphModel.GraphModel();
    graph.addEdge({ id: 'edge-1', source: 'node-1', target: 'node-2' });
    expect(graph.nodes).to.have.length(0);
    expect(graph.edges).to.have.length(1);

    graph.addNode({ id: 'node-1' });
    graph.addNode({ id: 'node-2' });
    expect(graph.nodes).to.have.length(2);
    expect(graph.filterEdges({ source: 'node-1' })).to.have.length(1);
  });

  test('topoLevels groups mutually unordered nodes', ({ expect }) => {
    const graph = new GraphModel.GraphModel();
    graph.pipe(
      GraphModel.addNode({ id: 'a' }),
      GraphModel.addNode({ id: 'b' }),
      GraphModel.addNode({ id: 'c' }),
      GraphModel.addNode({ id: 'd' }),
      GraphModel.addEdge({ id: 'a-c', source: 'a', target: 'c' }),
      GraphModel.addEdge({ id: 'b-c', source: 'b', target: 'c' }),
      GraphModel.addEdge({ id: 'c-d', source: 'c', target: 'd' }),
    );

    const levels = graph.topoLevels();
    expect(Option.isSome(levels)).to.be.true;
    expect(Option.getOrThrow(levels).map((level) => level.toSorted())).to.deep.eq([['a', 'b'], ['c'], ['d']]);
  });

  test('topoLevels honours the edge filter and reports cycles', ({ expect }) => {
    const graph = new GraphModel.GraphModel();
    graph.pipe(
      GraphModel.addNode({ id: 'a' }),
      GraphModel.addNode({ id: 'b' }),
      GraphModel.addEdge({ id: 'hard', type: 'hard', source: 'a', target: 'b' }),
      GraphModel.addEdge({ id: 'soft', type: 'soft', source: 'b', target: 'a' }),
    );

    const hardOnly = graph.topoLevels((edge) => edge.type === 'hard');
    expect(Option.getOrThrow(hardOnly)).to.deep.eq([['a'], ['b']]);

    // Both kinds together close the loop.
    expect(Option.isNone(graph.topoLevels())).to.be.true;
  });

  test('findCycle names the loop in order', ({ expect }) => {
    const graph = new GraphModel.GraphModel();
    graph.pipe(
      GraphModel.addNode({ id: 'x' }),
      GraphModel.addNode({ id: 'y' }),
      GraphModel.addEdge({ id: 'x-y', source: 'x', target: 'y' }),
      GraphModel.addEdge({ id: 'y-x', source: 'y', target: 'x' }),
    );

    const cycle = graph.findCycle();
    expect(cycle.map((step) => step.node)).to.deep.eq(['x', 'y']);
    expect(cycle.map((step) => step.edge.id)).to.deep.eq(['x-y', 'y-x']);

    graph.removeEdge('y-x');
    expect(graph.findCycle()).to.have.length(0);
  });

  test('mirrors structural mutations into the backing source', ({ expect }) => {
    const source: GraphModel.AnyData = { nodes: [], edges: [] };
    let transactions = 0;
    const graph = new GraphModel.GraphModel({
      graph: source,
      change: (fn) => {
        transactions++;
        fn();
      },
    });

    graph.addNode({ id: 'node-1' });
    graph.addNode({ id: 'node-2' });
    graph.addEdge({ id: 'edge-1', source: 'node-1', target: 'node-2' });
    expect(source.nodes.map((node) => node.id)).to.deep.eq(['node-1', 'node-2']);
    expect(source.edges.map((edge) => edge.id)).to.deep.eq(['edge-1']);
    expect(transactions).to.eq(3);

    graph.removeNode('node-1');
    expect(source.nodes.map((node) => node.id)).to.deep.eq(['node-2']);
    expect(source.edges).to.have.length(0);
  });

  test('sync reloads only when the source diverges', ({ expect }) => {
    const source: GraphModel.AnyData = { nodes: [{ id: 'node-1' }], edges: [] };
    const graph = new GraphModel.GraphModel({ graph: source, change: (fn) => fn() });
    expect(graph.nodes).to.have.length(1);

    // A field edit reaches the model through the node object it already holds.
    expect(graph.sync()).to.be.false;

    source.nodes.push({ id: 'node-2' });
    source.edges.push({ id: 'edge-1', source: 'node-1', target: 'node-2' });
    expect(graph.sync()).to.be.true;
    expect(graph.nodes.map((node) => node.id)).to.deep.eq(['node-1', 'node-2']);
    expect(graph.edges).to.have.length(1);
    expect(graph.sync()).to.be.false;

    source.nodes.splice(0, 1);
    expect(graph.sync()).to.be.true;
    expect(graph.nodes.map((node) => node.id)).to.deep.eq(['node-2']);
  });
});
