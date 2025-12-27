//
// Copyright 2023 DXOS.org
//

import { Atom, Registry } from '@effect-atom/atom-react';
import * as Option from 'effect/Option';
import { assert, describe, expect, onTestFinished, test } from 'vitest';

import { ROOT_ID, ROOT_TYPE, getGraph, make } from './graph';
import { type Node } from './node';

const exampleId = (id: number) => `dx:test:${id}`;
const EXAMPLE_ID = exampleId(1);
const EXAMPLE_TYPE = 'dxos.org/type/example';

describe('Graph', () => {
  test('getGraph', () => {
    const registry = Registry.make();
    const graph = make({ registry });
    const root = registry.get(graph.node(ROOT_ID));
    assert.ok(Option.isSome(root));
    expect(root.value.id).toEqual(ROOT_ID);
    expect(root.value.type).toEqual(ROOT_TYPE);
    expect(getGraph(root.value)).toEqual(graph);
  });

  test('add node', () => {
    const registry = Registry.make();
    const graph = make({ registry });
    graph.addNode({ id: EXAMPLE_ID, type: EXAMPLE_TYPE });
    const node = registry.get(graph.node(EXAMPLE_ID));
    assert.ok(Option.isSome(node));
    expect(node.value.id).toEqual(EXAMPLE_ID);
    expect(node.value.type).toEqual(EXAMPLE_TYPE);
    expect(node.value.data).toEqual(null);
    expect(node.value.properties).toEqual({});
  });

  test('add nodes updates existing nodes', () => {
    const registry = Registry.make();
    const graph = make({ registry });
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

    graph.addNode({ id: EXAMPLE_ID, type: EXAMPLE_TYPE });
    const node = registry.get(nodeKey);
    assert.ok(Option.isSome(node));
    expect(node.value.id).toEqual(EXAMPLE_ID);
    expect(node.value.type).toEqual(EXAMPLE_TYPE);
    expect(node.value.data).toEqual(null);
    expect(node.value.properties).toEqual({});
    expect(count).toEqual(2);

    graph.addNode({ id: EXAMPLE_ID, type: EXAMPLE_TYPE });
    expect(count).toEqual(2);
  });

  test('remove node', () => {
    const registry = Registry.make();
    const graph = make({ registry });

    {
      const node = registry.get(graph.node(EXAMPLE_ID));
      expect(Option.isNone(node)).toEqual(true);
    }

    {
      graph.addNode({ id: EXAMPLE_ID, type: EXAMPLE_TYPE });
      const node = registry.get(graph.node(EXAMPLE_ID));
      expect(Option.isSome(node)).toEqual(true);
    }

    {
      graph.removeNode(EXAMPLE_ID);
      const node = registry.get(graph.node(EXAMPLE_ID));
      expect(Option.isNone(node)).toEqual(true);
    }
  });

  test('onNodeChanged', () => {
    const graph = make();

    let node: Option.Option<Node> = Option.none();
    graph.onNodeChanged.on(({ node: newNode }) => {
      node = newNode;
    });

    graph.addNode({ id: EXAMPLE_ID, type: EXAMPLE_TYPE });
    assert.ok(Option.isSome(node));
    expect(node.value.id).toEqual(EXAMPLE_ID);
    expect(node.value.type).toEqual(EXAMPLE_TYPE);

    graph.removeNode(EXAMPLE_ID);
    expect(node.pipe(Option.getOrNull)).toEqual(null);
  });

  test('add edge', () => {
    const registry = Registry.make();
    const graph = make({ registry });
    graph.addEdge({ source: exampleId(1), target: exampleId(2) });
    const edges = registry.get(graph.edges(exampleId(1)));
    expect(edges.inbound).toEqual([]);
    expect(edges.outbound).toEqual([exampleId(2)]);
  });

  test('add edges is idempotent', () => {
    const registry = Registry.make();
    const graph = make({ registry });
    graph.addEdge({ source: exampleId(1), target: exampleId(2) });
    graph.addEdge({ source: exampleId(1), target: exampleId(2) });
    const edges = registry.get(graph.edges(exampleId(1)));
    expect(edges.inbound).toEqual([]);
    expect(edges.outbound).toEqual([exampleId(2)]);
  });

  test('sort edges', () => {
    const registry = Registry.make();
    const graph = make({ registry });

    {
      graph.addEdge({ source: exampleId(1), target: exampleId(2) });
      graph.addEdge({ source: exampleId(1), target: exampleId(3) });
      graph.addEdge({ source: exampleId(1), target: exampleId(4) });
      const edges = registry.get(graph.edges(exampleId(1)));
      expect(edges.outbound).toEqual([exampleId(2), exampleId(3), exampleId(4)]);
    }

    {
      graph.sortEdges(exampleId(1), 'outbound', [exampleId(3), exampleId(2)]);
      const edges = registry.get(graph.edges(exampleId(1)));
      expect(edges.outbound).toEqual([exampleId(3), exampleId(2), exampleId(4)]);
    }
  });

  test('remove edge', () => {
    const registry = Registry.make();
    const graph = make({ registry });

    {
      graph.addEdge({ source: exampleId(1), target: exampleId(2) });
      const edges = registry.get(graph.edges(exampleId(1)));
      expect(edges.inbound).toEqual([]);
      expect(edges.outbound).toEqual([exampleId(2)]);
    }

    {
      graph.removeEdge({ source: exampleId(1), target: exampleId(2) });
      const edges = registry.get(graph.edges(exampleId(1)));
      expect(edges.inbound).toEqual([]);
      expect(edges.outbound).toEqual([]);
    }
  });

  test('get connections', () => {
    const registry = Registry.make();
    const graph = make({ registry });
    graph.addNode({ id: exampleId(1), type: EXAMPLE_TYPE });
    graph.addNode({ id: exampleId(2), type: EXAMPLE_TYPE });
    graph.addEdge({ source: exampleId(1), target: exampleId(2) });
    const nodes = registry.get(graph.connections(exampleId(1)));
    expect(nodes).has.length(1);
    expect(nodes[0].id).toEqual(exampleId(2));
  });

  test('can subscribe to a node before it exists', async () => {
    const registry = Registry.make();
    const graph = make({ registry });
    const nodeKey = graph.node(exampleId(1));

    let node: Option.Option<Node> = Option.none();
    const cancel = registry.subscribe(nodeKey, (n) => {
      node = n;
    });
    onTestFinished(() => cancel());

    expect(node).toEqual(Option.none());
    graph.addNode({ id: exampleId(1), type: EXAMPLE_TYPE });
    assert.ok(Option.isSome(node));
    expect(node.value.id).toEqual(exampleId(1));
  });

  test('connections updates', () => {
    const registry = Registry.make();
    const graph = make({ registry });
    assert.strictEqual(graph.connections(exampleId(1)), graph.connections(exampleId(1)));
    const childrenKey = graph.connections(exampleId(1));

    let count = 0;
    const cancel = registry.subscribe(childrenKey, (_) => {
      count++;
    });
    onTestFinished(() => cancel());

    graph.addNode({ id: exampleId(1), type: EXAMPLE_TYPE });
    graph.addNode({ id: exampleId(2), type: EXAMPLE_TYPE });
    graph.addEdge({ source: exampleId(1), target: exampleId(2) });

    expect(count).toEqual(0);
    const children = registry.get(childrenKey);
    expect(children).has.length(1);
    expect(children[0].id).toEqual(exampleId(2));
    expect(count).toEqual(1);

    // Updating an existing node fires an update.
    graph.addNode({ id: exampleId(2), type: EXAMPLE_TYPE, data: 'updated' });
    expect(count).toEqual(2);

    // Adding a node with no changes does not fire an update.
    graph.addNode({ id: exampleId(2), type: EXAMPLE_TYPE, data: 'updated' });
    expect(count).toEqual(2);

    // Adding an unconnected node does not fire an update.
    graph.addNode({ id: exampleId(3), type: EXAMPLE_TYPE });
    expect(count).toEqual(2);

    // Connecting a node fires an update.
    graph.addEdge({ source: exampleId(1), target: exampleId(3) });
    expect(count).toEqual(3);

    // Adding an edge connected to nothing fires an update.
    // TODO(wittjosiah): Is there a way to avoid this?
    graph.addEdge({ source: exampleId(1), target: exampleId(4) });
    expect(count).toEqual(4);

    // Adding a node to an existing edge fires an update.
    graph.addNode({ id: exampleId(4), type: EXAMPLE_TYPE });
    expect(count).toEqual(5);

    // Batching the edge and node updates fires a single update.
    Atom.batch(() => {
      graph.addEdge({ source: exampleId(1), target: exampleId(6) });
      graph.addNode({ id: exampleId(6), type: EXAMPLE_TYPE });
    });
    expect(count).toEqual(6);
  });

  test('toJSON', () => {
    const graph = make();

    graph.addNode({
      id: ROOT_ID,
      type: ROOT_TYPE,
      nodes: [
        { id: 'test1', type: 'test' },
        { id: 'test2', type: 'test' },
      ],
    });
    graph.addEdge({ source: 'test1', target: 'test2' });

    const json = graph.toJSON();
    expect(json).to.deep.equal({
      id: ROOT_ID,
      type: ROOT_TYPE,
      nodes: [
        { id: 'test1', type: 'test', nodes: [{ id: 'test2', type: 'test' }] },
        { id: 'test2', type: 'test' },
      ],
    });
  });

  test('subscribe to json', () => {
    const registry = Registry.make();
    const graph = make({ registry });

    graph.addNode({
      id: ROOT_ID,
      type: ROOT_TYPE,
      nodes: [
        { id: 'test1', type: 'test' },
        { id: 'test2', type: 'test' },
      ],
    });
    graph.addEdge({ source: 'test1', target: 'test2' });

    let json: any;
    const cancel = registry.subscribe(graph.json(), (_) => {
      json = _;
    });
    onTestFinished(() => cancel());

    registry.get(graph.json());
    expect(json).to.deep.equal({
      id: ROOT_ID,
      type: ROOT_TYPE,
      nodes: [
        { id: 'test1', type: 'test', nodes: [{ id: 'test2', type: 'test' }] },
        { id: 'test2', type: 'test' },
      ],
    });

    graph.addNode({ id: 'test3', type: 'test' });
    graph.addEdge({ source: 'root', target: 'test3' });
    expect(json).to.deep.equal({
      id: ROOT_ID,
      type: ROOT_TYPE,
      nodes: [
        { id: 'test1', type: 'test', nodes: [{ id: 'test2', type: 'test' }] },
        { id: 'test2', type: 'test' },
        { id: 'test3', type: 'test' },
      ],
    });
  });

  test('get path', () => {
    const graph = make();
    graph.addNode({
      id: ROOT_ID,
      type: ROOT_TYPE,
      nodes: [
        { id: exampleId(1), type: EXAMPLE_TYPE },
        { id: exampleId(2), type: EXAMPLE_TYPE },
      ],
    });
    graph.addEdge({ source: exampleId(1), target: exampleId(2) });

    expect(graph.getPath({ target: exampleId(2) }).pipe(Option.getOrNull)).to.deep.equal([
      'root',
      exampleId(1),
      exampleId(2),
    ]);
    expect(graph.getPath({ source: exampleId(1), target: exampleId(2) }).pipe(Option.getOrNull)).to.deep.equal([
      exampleId(1),
      exampleId(2),
    ]);
    expect(graph.getPath({ source: exampleId(2), target: exampleId(1) }).pipe(Option.getOrNull)).to.be.null;
  });

  describe('traverse', () => {
    test('can be traversed', () => {
      const graph = make();
      graph.addNode({
        id: ROOT_ID,
        type: ROOT_TYPE,
        nodes: [
          { id: 'test1', type: 'test' },
          { id: 'test2', type: 'test' },
        ],
      });

      const nodes: string[] = [];
      graph.traverse({
        visitor: (node) => {
          nodes.push(node.id);
        },
      });
      expect(nodes).to.deep.equal(['root', 'test1', 'test2']);
    });

    test('traversal breaks cycles', () => {
      const graph = make();
      graph.addNode({
        id: ROOT_ID,
        type: ROOT_TYPE,
        nodes: [
          { id: 'test1', type: 'test' },
          { id: 'test2', type: 'test' },
        ],
      });
      graph.addEdge({ source: 'test1', target: 'root' });

      const nodes: string[] = [];
      graph.traverse({
        visitor: (node) => {
          nodes.push(node.id);
        },
      });
      expect(nodes).to.deep.equal(['root', 'test1', 'test2']);
    });

    test('traversal can be started from any node', () => {
      const graph = make();
      graph.addNode({
        id: ROOT_ID,
        type: ROOT_TYPE,
        nodes: [
          {
            id: 'test1',
            type: 'test',
            nodes: [{ id: 'test2', type: 'test', nodes: [{ id: 'test3', type: 'test' }] }],
          },
        ],
      });

      const nodes: string[] = [];
      graph.traverse({
        source: 'test2',
        visitor: (node) => {
          nodes.push(node.id);
        },
      });
      expect(nodes).to.deep.equal(['test2', 'test3']);
    });

    test('traversal can follow inbound edges', () => {
      const graph = make();
      graph.addNode({
        id: ROOT_ID,
        type: ROOT_TYPE,
        nodes: [
          {
            id: 'test1',
            type: 'test',
            nodes: [{ id: 'test2', type: 'test', nodes: [{ id: 'test3', type: 'test' }] }],
          },
        ],
      });

      const nodes: string[] = [];
      graph.traverse({
        source: 'test2',
        relation: 'inbound',
        visitor: (node) => {
          nodes.push(node.id);
        },
      });
      expect(nodes).to.deep.equal(['test2', 'test1', 'root']);
    });

    test('traversal can be terminated early', () => {
      const graph = make();
      graph.addNode({
        id: ROOT_ID,
        type: ROOT_TYPE,
        nodes: [
          { id: 'test1', type: 'test' },
          { id: 'test2', type: 'test' },
        ],
      });

      const nodes: string[] = [];
      graph.traverse({
        visitor: (node) => {
          if (nodes.length === 2) {
            return false;
          }

          nodes.push(node.id);
        },
      });
      expect(nodes).to.deep.equal(['root', 'test1']);
    });
  });
});
