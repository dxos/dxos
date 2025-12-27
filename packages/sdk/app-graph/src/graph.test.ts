//
// Copyright 2023 DXOS.org
//

import { Atom, Registry } from '@effect-atom/atom-react';
import * as Option from 'effect/Option';
import { assert, describe, expect, onTestFinished, test } from 'vitest';

import * as Graph from './graph';
import * as GraphBuilder from './graph-builder';
import { createExtension, make as makeGraphBuilder } from './graph-builder';
import { type Node } from './node';

const exampleId = (id: number) => `dx:test:${id}`;
const EXAMPLE_ID = exampleId(1);
const EXAMPLE_TYPE = 'dxos.org/type/example';

describe('Graph', () => {
  test('getGraph', () => {
    const registry = Registry.make();
    const graph = Graph.make({ registry });
    const root = registry.get(graph.node(Graph.ROOT_ID));
    assert.ok(Option.isSome(root));
    expect(root.value.id).toEqual(Graph.ROOT_ID);
    expect(root.value.type).toEqual(Graph.ROOT_TYPE);
    expect(Graph.getGraph(root.value)).toEqual(graph);
  });

  test('add node', () => {
    const registry = Registry.make();
    const graph = Graph.make({ registry });
    Graph.addNode(graph, { id: EXAMPLE_ID, type: EXAMPLE_TYPE });
    const node = registry.get(graph.node(EXAMPLE_ID));
    assert.ok(Option.isSome(node));
    expect(node.value.id).toEqual(EXAMPLE_ID);
    expect(node.value.type).toEqual(EXAMPLE_TYPE);
    expect(node.value.data).toEqual(null);
    expect(node.value.properties).toEqual({});
  });

  test('add node curried', () => {
    const registry = Registry.make();
    const graph = Graph.make({ registry });
    const result = graph.pipe(Graph.addNode({ id: EXAMPLE_ID, type: EXAMPLE_TYPE }));
    expect(result).toEqual(graph);
    const node = registry.get(graph.node(EXAMPLE_ID));
    assert.ok(Option.isSome(node));
    expect(node.value.id).toEqual(EXAMPLE_ID);
    expect(node.value.type).toEqual(EXAMPLE_TYPE);
  });

  test('add nodes updates existing nodes', () => {
    const registry = Registry.make();
    const graph = Graph.make({ registry });
    const nodeKey = graph.node(EXAMPLE_ID);

    let count = 0;
    const cancel = registry.subscribe(nodeKey, (_) => {
      count++;
    });
    onTestFinished(() => cancel());

    expect(registry.get(nodeKey)).toEqual(Option.none());
    expect(count).toEqual(1);

    expect(registry.get(nodeKey)).toEqual(Option.none());
    expect(count).toEqual(1);

    Graph.addNode(graph, { id: EXAMPLE_ID, type: EXAMPLE_TYPE });
    const node = registry.get(nodeKey);
    assert.ok(Option.isSome(node));
    expect(node.value.id).toEqual(EXAMPLE_ID);
    expect(node.value.type).toEqual(EXAMPLE_TYPE);
    expect(node.value.data).toEqual(null);
    expect(node.value.properties).toEqual({});
    expect(count).toEqual(2);

    Graph.addNode(graph, { id: EXAMPLE_ID, type: EXAMPLE_TYPE });
    expect(count).toEqual(2);
  });

  test('remove node', () => {
    const registry = Registry.make();
    const graph = Graph.make({ registry });

    {
      const node = registry.get(graph.node(EXAMPLE_ID));
      expect(Option.isNone(node)).toEqual(true);
    }

    {
      Graph.addNode(graph, { id: EXAMPLE_ID, type: EXAMPLE_TYPE });
      const node = registry.get(graph.node(EXAMPLE_ID));
      expect(Option.isSome(node)).toEqual(true);
    }

    {
      Graph.removeNode(graph, EXAMPLE_ID);
      const node = registry.get(graph.node(EXAMPLE_ID));
      expect(Option.isNone(node)).toEqual(true);
    }
  });

  test('remove node curried', () => {
    const registry = Registry.make();
    const graph = Graph.make({ registry });
    Graph.addNode(graph, { id: EXAMPLE_ID, type: EXAMPLE_TYPE });
    const result = graph.pipe(Graph.removeNode(EXAMPLE_ID));
    expect(result).toEqual(graph);
    const node = registry.get(graph.node(EXAMPLE_ID));
    assert.ok(Option.isNone(node));
  });

  test('onNodeChanged', () => {
    const graph = Graph.make();

    let node: Option.Option<Node> = Option.none();
    graph.onNodeChanged.on(({ node: newNode }) => {
      node = newNode;
    });

    Graph.addNode(graph, { id: EXAMPLE_ID, type: EXAMPLE_TYPE });
    assert.ok(Option.isSome(node));
    expect(node.value.id).toEqual(EXAMPLE_ID);
    expect(node.value.type).toEqual(EXAMPLE_TYPE);

    Graph.removeNode(graph, EXAMPLE_ID);
    expect(node.pipe(Option.getOrNull)).toEqual(null);
  });

  test('add edge', () => {
    const registry = Registry.make();
    const graph = Graph.make({ registry });
    Graph.addEdge(graph, { source: exampleId(1), target: exampleId(2) });
    const edges = registry.get(graph.edges(exampleId(1)));
    expect(edges.inbound).toEqual([]);
    expect(edges.outbound).toEqual([exampleId(2)]);
  });

  test('add edges is idempotent', () => {
    const registry = Registry.make();
    const graph = Graph.make({ registry });
    Graph.addEdge(graph, { source: exampleId(1), target: exampleId(2) });
    Graph.addEdge(graph, { source: exampleId(1), target: exampleId(2) });
    const edges = registry.get(graph.edges(exampleId(1)));
    expect(edges.inbound).toEqual([]);
    expect(edges.outbound).toEqual([exampleId(2)]);
  });

  test('sort edges', () => {
    const registry = Registry.make();
    const graph = Graph.make({ registry });

    {
      Graph.addEdge(graph, { source: exampleId(1), target: exampleId(2) });
      Graph.addEdge(graph, { source: exampleId(1), target: exampleId(3) });
      Graph.addEdge(graph, { source: exampleId(1), target: exampleId(4) });
      const edges = registry.get(graph.edges(exampleId(1)));
      expect(edges.outbound).toEqual([exampleId(2), exampleId(3), exampleId(4)]);
    }

    {
      Graph.sortEdges(graph, exampleId(1), 'outbound', [exampleId(3), exampleId(2)]);
      const edges = registry.get(graph.edges(exampleId(1)));
      expect(edges.outbound).toEqual([exampleId(3), exampleId(2), exampleId(4)]);
    }
  });

  test('remove edge', () => {
    const registry = Registry.make();
    const graph = Graph.make({ registry });

    {
      Graph.addEdge(graph, { source: exampleId(1), target: exampleId(2) });
      const edges = registry.get(graph.edges(exampleId(1)));
      expect(edges.inbound).toEqual([]);
      expect(edges.outbound).toEqual([exampleId(2)]);
    }

    {
      Graph.removeEdge(graph, { source: exampleId(1), target: exampleId(2) });
      const edges = registry.get(graph.edges(exampleId(1)));
      expect(edges.inbound).toEqual([]);
      expect(edges.outbound).toEqual([]);
    }
  });

  test('remove edge curried', () => {
    const registry = Registry.make();
    const graph = Graph.make({ registry });
    Graph.addNode(graph, { id: exampleId(1), type: EXAMPLE_TYPE });
    Graph.addNode(graph, { id: exampleId(2), type: EXAMPLE_TYPE });
    Graph.addEdge(graph, { source: exampleId(1), target: exampleId(2) });
    const result = graph.pipe(Graph.removeEdge({ source: exampleId(1), target: exampleId(2) }));
    expect(result).toEqual(graph);
    const edges = registry.get(graph.edges(exampleId(1)));
    expect(edges.inbound).toEqual([]);
    expect(edges.outbound).toEqual([]);
  });

  test('get connections', () => {
    const registry = Registry.make();
    const graph = Graph.make({ registry });
    Graph.addNode(graph, { id: exampleId(1), type: EXAMPLE_TYPE });
    Graph.addNode(graph, { id: exampleId(2), type: EXAMPLE_TYPE });
    Graph.addEdge(graph, { source: exampleId(1), target: exampleId(2) });
    const nodes = registry.get(graph.connections(exampleId(1)));
    expect(nodes).has.length(1);
    expect(nodes[0].id).toEqual(exampleId(2));
  });

  test('can subscribe to a node before it exists', async () => {
    const registry = Registry.make();
    const graph = Graph.make({ registry });
    const nodeKey = graph.node(exampleId(1));

    let node: Option.Option<Node> = Option.none();
    const cancel = registry.subscribe(nodeKey, (n) => {
      node = n;
    });
    onTestFinished(() => cancel());

    expect(node).toEqual(Option.none());
    Graph.addNode(graph, { id: exampleId(1), type: EXAMPLE_TYPE });
    assert.ok(Option.isSome(node));
    expect(node.value.id).toEqual(exampleId(1));
  });

  test('connections updates', () => {
    const registry = Registry.make();
    const graph = Graph.make({ registry });
    assert.strictEqual(graph.connections(exampleId(1)), graph.connections(exampleId(1)));
    const childrenKey = graph.connections(exampleId(1));

    let count = 0;
    const cancel = registry.subscribe(childrenKey, (_) => {
      count++;
    });
    onTestFinished(() => cancel());

    graph.pipe(
      Graph.addNode({ id: exampleId(1), type: EXAMPLE_TYPE }),
      Graph.addNode({ id: exampleId(2), type: EXAMPLE_TYPE }),
      Graph.addEdge({ source: exampleId(1), target: exampleId(2) }),
    );

    expect(count).toEqual(0);
    const children = registry.get(childrenKey);
    expect(children).has.length(1);
    expect(children[0].id).toEqual(exampleId(2));
    expect(count).toEqual(1);

    // Updating an existing node fires an update.
    Graph.addNode(graph, { id: exampleId(2), type: EXAMPLE_TYPE, data: 'updated' });
    expect(count).toEqual(2);

    // Adding a node with no changes does not fire an update.
    Graph.addNode(graph, { id: exampleId(2), type: EXAMPLE_TYPE, data: 'updated' });
    expect(count).toEqual(2);

    // Adding an unconnected node does not fire an update.
    Graph.addNode(graph, { id: exampleId(3), type: EXAMPLE_TYPE });
    expect(count).toEqual(2);

    // Connecting a node fires an update.
    Graph.addEdge(graph, { source: exampleId(1), target: exampleId(3) });
    expect(count).toEqual(3);

    // Adding an edge connected to nothing fires an update.
    // TODO(wittjosiah): Is there a way to avoid this?
    Graph.addEdge(graph, { source: exampleId(1), target: exampleId(4) });
    expect(count).toEqual(4);

    // Adding a node to an existing edge fires an update.
    Graph.addNode(graph, { id: exampleId(4), type: EXAMPLE_TYPE });
    expect(count).toEqual(5);

    // Batching the edge and node updates fires a single update.
    Atom.batch(() => {
      graph.pipe(
        Graph.addEdge({ source: exampleId(1), target: exampleId(6) }),
        Graph.addNode({ id: exampleId(6), type: EXAMPLE_TYPE }),
      );
    });
    expect(count).toEqual(6);
  });

  test('toJSON', () => {
    const graph = Graph.make();

    Graph.addNode(graph, {
      id: Graph.ROOT_ID,
      type: Graph.ROOT_TYPE,
      nodes: [
        { id: 'test1', type: 'test' },
        { id: 'test2', type: 'test' },
      ],
    });
    Graph.addEdge(graph, { source: 'test1', target: 'test2' });

    const json = Graph.toJSON(graph);
    expect(json).to.deep.equal({
      id: Graph.ROOT_ID,
      type: Graph.ROOT_TYPE,
      nodes: [
        { id: 'test1', type: 'test', nodes: [{ id: 'test2', type: 'test' }] },
        { id: 'test2', type: 'test' },
      ],
    });
  });

  test('subscribe to json', () => {
    const registry = Registry.make();
    const graph = Graph.make({ registry });

    Graph.addNode(graph, {
      id: Graph.ROOT_ID,
      type: Graph.ROOT_TYPE,
      nodes: [
        { id: 'test1', type: 'test' },
        { id: 'test2', type: 'test' },
      ],
    });
    Graph.addEdge(graph, { source: 'test1', target: 'test2' });

    let json: any;
    const cancel = registry.subscribe(graph.json(), (_) => {
      json = _;
    });
    onTestFinished(() => cancel());

    registry.get(graph.json());
    expect(json).to.deep.equal({
      id: Graph.ROOT_ID,
      type: Graph.ROOT_TYPE,
      nodes: [
        { id: 'test1', type: 'test', nodes: [{ id: 'test2', type: 'test' }] },
        { id: 'test2', type: 'test' },
      ],
    });

    Graph.addNode(graph, { id: 'test3', type: 'test' });
    Graph.addEdge(graph, { source: 'root', target: 'test3' });
    expect(json).to.deep.equal({
      id: Graph.ROOT_ID,
      type: Graph.ROOT_TYPE,
      nodes: [
        { id: 'test1', type: 'test', nodes: [{ id: 'test2', type: 'test' }] },
        { id: 'test2', type: 'test' },
        { id: 'test3', type: 'test' },
      ],
    });
  });

  test('get path', () => {
    const graph = Graph.make();
    Graph.addNode(graph, {
      id: Graph.ROOT_ID,
      type: Graph.ROOT_TYPE,
      nodes: [
        { id: exampleId(1), type: EXAMPLE_TYPE },
        { id: exampleId(2), type: EXAMPLE_TYPE },
      ],
    });
    Graph.addEdge(graph, { source: exampleId(1), target: exampleId(2) });

    expect(Graph.getPath(graph, { target: exampleId(2) }).pipe(Option.getOrNull)).to.deep.equal([
      'root',
      exampleId(1),
      exampleId(2),
    ]);
    expect(Graph.getPath(graph, { source: exampleId(1), target: exampleId(2) }).pipe(Option.getOrNull)).to.deep.equal([
      exampleId(1),
      exampleId(2),
    ]);
    expect(Graph.getPath(graph, { source: exampleId(2), target: exampleId(1) }).pipe(Option.getOrNull)).to.be.null;
  });

  test('get path curried', () => {
    const graph = Graph.make();
    Graph.addNode(graph, {
      id: Graph.ROOT_ID,
      type: Graph.ROOT_TYPE,
      nodes: [
        { id: exampleId(1), type: EXAMPLE_TYPE },
        { id: exampleId(2), type: EXAMPLE_TYPE },
      ],
    });
    Graph.addEdge(graph, { source: exampleId(1), target: exampleId(2) });
    const path = graph.pipe(Graph.getPath({ target: exampleId(2) }));
    expect(path.pipe(Option.getOrNull)).to.deep.equal(['root', exampleId(1), exampleId(2)]);
  });

  describe('traverse', () => {
    test('can be traversed', () => {
      const graph = Graph.make();
      Graph.addNode(graph, {
        id: Graph.ROOT_ID,
        type: Graph.ROOT_TYPE,
        nodes: [
          { id: 'test1', type: 'test' },
          { id: 'test2', type: 'test' },
        ],
      });

      const nodes: string[] = [];
      Graph.traverse(graph, {
        visitor: (node) => {
          nodes.push(node.id);
        },
      });
      expect(nodes).to.deep.equal(['root', 'test1', 'test2']);
    });

    test('traversal breaks cycles', () => {
      const graph = Graph.make();
      Graph.addNode(graph, {
        id: Graph.ROOT_ID,
        type: Graph.ROOT_TYPE,
        nodes: [
          { id: 'test1', type: 'test' },
          { id: 'test2', type: 'test' },
        ],
      });
      Graph.addEdge(graph, { source: 'test1', target: 'root' });

      const nodes: string[] = [];
      Graph.traverse(graph, {
        visitor: (node) => {
          nodes.push(node.id);
        },
      });
      expect(nodes).to.deep.equal(['root', 'test1', 'test2']);
    });

    test('traversal can be started from any node', () => {
      const graph = Graph.make();
      Graph.addNode(graph, {
        id: Graph.ROOT_ID,
        type: Graph.ROOT_TYPE,
        nodes: [
          {
            id: 'test1',
            type: 'test',
            nodes: [{ id: 'test2', type: 'test', nodes: [{ id: 'test3', type: 'test' }] }],
          },
        ],
      });

      const nodes: string[] = [];
      Graph.traverse(graph, {
        source: 'test2',
        visitor: (node) => {
          nodes.push(node.id);
        },
      });
      expect(nodes).to.deep.equal(['test2', 'test3']);
    });

    test('traversal can follow inbound edges', () => {
      const graph = Graph.make();
      Graph.addNode(graph, {
        id: Graph.ROOT_ID,
        type: Graph.ROOT_TYPE,
        nodes: [
          {
            id: 'test1',
            type: 'test',
            nodes: [{ id: 'test2', type: 'test', nodes: [{ id: 'test3', type: 'test' }] }],
          },
        ],
      });

      const nodes: string[] = [];
      Graph.traverse(graph, {
        source: 'test2',
        relation: 'inbound',
        visitor: (node) => {
          nodes.push(node.id);
        },
      });
      expect(nodes).to.deep.equal(['test2', 'test1', 'root']);
    });

    test('traversal can be terminated early', () => {
      const graph = Graph.make();
      Graph.addNode(graph, {
        id: Graph.ROOT_ID,
        type: Graph.ROOT_TYPE,
        nodes: [
          { id: 'test1', type: 'test' },
          { id: 'test2', type: 'test' },
        ],
      });

      const nodes: string[] = [];
      Graph.traverse(graph, {
        visitor: (node) => {
          if (nodes.length === 2) {
            return false;
          }

          nodes.push(node.id);
        },
      });
      expect(nodes).to.deep.equal(['root', 'test1']);
    });

    test('traverse curried', () => {
      const graph = Graph.make();
      Graph.addNode(graph, {
        id: Graph.ROOT_ID,
        type: Graph.ROOT_TYPE,
        nodes: [{ id: 'test1', type: 'test' }],
      });
      Graph.addNode(graph, { id: 'test2', type: 'test' });
      Graph.addEdge(graph, { source: 'test1', target: 'test2' });
      const nodes: string[] = [];
      graph.pipe(
        Graph.traverse({
          source: Graph.ROOT_ID,
          visitor: (node, _path) => {
            nodes.push(node.id);
          },
        }),
      );
      expect(nodes).to.deep.equal(['root', 'test1', 'test2']);
    });
  });

  test('add nodes curried', () => {
    const registry = Registry.make();
    const graph = Graph.make({ registry });
    const result = graph.pipe(
      Graph.addNodes([
        { id: exampleId(1), type: EXAMPLE_TYPE },
        { id: exampleId(2), type: EXAMPLE_TYPE },
      ]),
    );
    expect(result).toEqual(graph);
    const node1 = registry.get(graph.node(exampleId(1)));
    const node2 = registry.get(graph.node(exampleId(2)));
    assert.ok(Option.isSome(node1));
    assert.ok(Option.isSome(node2));
    expect(node1.value.id).toEqual(exampleId(1));
    expect(node2.value.id).toEqual(exampleId(2));
  });

  test('add edges curried', () => {
    const registry = Registry.make();
    const graph = Graph.make({ registry });
    Graph.addNode(graph, { id: exampleId(1), type: EXAMPLE_TYPE });
    Graph.addNode(graph, { id: exampleId(2), type: EXAMPLE_TYPE });
    Graph.addNode(graph, { id: exampleId(3), type: EXAMPLE_TYPE });
    const result = graph.pipe(
      Graph.addEdges([
        { source: exampleId(1), target: exampleId(2) },
        { source: exampleId(1), target: exampleId(3) },
      ]),
    );
    expect(result).toEqual(graph);
    const edges = registry.get(graph.edges(exampleId(1)));
    expect(edges.outbound).to.have.length(2);
    expect(edges.outbound).to.include(exampleId(2));
    expect(edges.outbound).to.include(exampleId(3));
  });

  test('remove nodes curried', () => {
    const registry = Registry.make();
    const graph = Graph.make({ registry });
    Graph.addNode(graph, { id: exampleId(1), type: EXAMPLE_TYPE });
    Graph.addNode(graph, { id: exampleId(2), type: EXAMPLE_TYPE });
    const result = graph.pipe(Graph.removeNodes([exampleId(1), exampleId(2)]));
    expect(result).toEqual(graph);
    const node1 = registry.get(graph.node(exampleId(1)));
    const node2 = registry.get(graph.node(exampleId(2)));
    assert.ok(Option.isNone(node1));
    assert.ok(Option.isNone(node2));
  });

  test('remove edges curried', () => {
    const registry = Registry.make();
    const graph = Graph.make({ registry });
    Graph.addNode(graph, { id: exampleId(1), type: EXAMPLE_TYPE });
    Graph.addNode(graph, { id: exampleId(2), type: EXAMPLE_TYPE });
    Graph.addNode(graph, { id: exampleId(3), type: EXAMPLE_TYPE });
    Graph.addEdge(graph, { source: exampleId(1), target: exampleId(2) });
    Graph.addEdge(graph, { source: exampleId(1), target: exampleId(3) });
    const result = graph.pipe(
      Graph.removeEdges([
        { source: exampleId(1), target: exampleId(2) },
        { source: exampleId(1), target: exampleId(3) },
      ]),
    );
    expect(result).toEqual(graph);
    const edges = registry.get(graph.edges(exampleId(1)));
    expect(edges.outbound).to.have.length(0);
  });

  test('expand curried', async () => {
    const registry = Registry.make();
    const builder = makeGraphBuilder({ registry });
    const graph = builder.graph;
    let expandCalled = false;
    GraphBuilder.addExtension(
      builder,
      createExtension({
        id: 'test',
        connector: () => {
          expandCalled = true;
          return Atom.make([]);
        },
      }),
    );
    await graph.pipe(Graph.expand(Graph.ROOT_ID));
    expect(expandCalled).to.be.true;
  });

  test('initialize curried', async () => {
    const registry = Registry.make();
    const builder = makeGraphBuilder({ registry });
    const graph = builder.graph;
    let initializeCalled = false;
    GraphBuilder.addExtension(
      builder,
      createExtension({
        id: 'test',
        resolver: () => {
          initializeCalled = true;
          return Atom.make({ id: EXAMPLE_ID, type: EXAMPLE_TYPE });
        },
      }),
    );
    await graph.pipe(Graph.initialize(EXAMPLE_ID));
    expect(initializeCalled).to.be.true;
  });

  test('waitForPath curried', async () => {
    const graph = Graph.make();
    Graph.addNode(graph, {
      id: Graph.ROOT_ID,
      type: Graph.ROOT_TYPE,
      nodes: [{ id: exampleId(1), type: EXAMPLE_TYPE }],
    });
    const path = await graph.pipe(Graph.waitForPath({ target: exampleId(1) }, { timeout: 1000 }));
    expect(path).to.deep.equal(['root', exampleId(1)]);
  });
});
