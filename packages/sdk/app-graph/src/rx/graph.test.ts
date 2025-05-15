//
// Copyright 2023 DXOS.org
//

import { Registry, Rx } from '@effect-rx/rx-react';
import { Option } from 'effect';
import { assert, describe, expect, onTestFinished, test } from 'vitest';

import { getGraph, Graph, ROOT_ID, ROOT_TYPE } from './graph';
import { type Node } from '../node';

const exampleId = (id: number) => `dx:test:${id}`;
const EXAMPLE_ID = exampleId(1);
const EXAMPLE_TYPE = 'dxos.org/type/example';

describe('RxGraph', () => {
  test('getGraph', () => {
    const r = Registry.make();
    const graph = new Graph();
    const root = r.get(graph.node(ROOT_ID));
    assert.ok(Option.isSome(root));
    expect(root.value.id).toEqual(ROOT_ID);
    expect(root.value.type).toEqual(ROOT_TYPE);
    expect(getGraph(root.value)).toEqual(graph);
  });

  test('add node', () => {
    const r = Registry.make();
    const graph = new Graph();
    graph.addNode(r, { id: EXAMPLE_ID, type: EXAMPLE_TYPE });
    const node = r.get(graph.node(EXAMPLE_ID));
    assert.ok(Option.isSome(node));
    expect(node.value.id).toEqual(EXAMPLE_ID);
    expect(node.value.type).toEqual(EXAMPLE_TYPE);
    expect(node.value.data).toEqual(null);
    expect(node.value.properties).toEqual({});
  });

  test('add nodes updates existing nodes', () => {
    const r = Registry.make();
    const graph = new Graph();
    const nodeKey = graph.node(EXAMPLE_ID);

    let count = 0;
    const cancel = r.subscribe(nodeKey, (_) => {
      count++;
    });
    onTestFinished(() => cancel());

    expect(r.get(nodeKey)).toEqual(Option.none());
    expect(count).toEqual(1);

    expect(r.get(nodeKey)).toEqual(Option.none());
    expect(count).toEqual(1);

    graph.addNode(r, { id: EXAMPLE_ID, type: EXAMPLE_TYPE });
    const node = r.get(nodeKey);
    assert.ok(Option.isSome(node));
    expect(node.value.id).toEqual(EXAMPLE_ID);
    expect(node.value.type).toEqual(EXAMPLE_TYPE);
    expect(node.value.data).toEqual(null);
    expect(node.value.properties).toEqual({});
    expect(count).toEqual(2);

    graph.addNode(r, { id: EXAMPLE_ID, type: EXAMPLE_TYPE });
    expect(count).toEqual(2);
  });

  test('remove node', () => {
    const r = Registry.make();
    const graph = new Graph();

    {
      const node = r.get(graph.node(EXAMPLE_ID));
      expect(Option.isNone(node)).toEqual(true);
    }

    {
      graph.addNode(r, { id: EXAMPLE_ID, type: EXAMPLE_TYPE });
      const node = r.get(graph.node(EXAMPLE_ID));
      expect(Option.isSome(node)).toEqual(true);
    }

    {
      graph.removeNode(r, EXAMPLE_ID);
      const node = r.get(graph.node(EXAMPLE_ID));
      expect(Option.isNone(node)).toEqual(true);
    }
  });

  test('add edge', () => {
    const r = Registry.make();
    const graph = new Graph();
    graph.addEdge(r, { source: exampleId(1), target: exampleId(2) });
    const edges = r.get(graph.edges(exampleId(1)));
    expect(edges.inbound).toEqual([]);
    expect(edges.outbound).toEqual([exampleId(2)]);
  });

  test('add edges is idempotent', () => {
    const r = Registry.make();
    const graph = new Graph();
    graph.addEdge(r, { source: exampleId(1), target: exampleId(2) });
    graph.addEdge(r, { source: exampleId(1), target: exampleId(2) });
    const edges = r.get(graph.edges(exampleId(1)));
    expect(edges.inbound).toEqual([]);
    expect(edges.outbound).toEqual([exampleId(2)]);
  });

  test('sort edges', () => {
    const r = Registry.make();
    const graph = new Graph();

    {
      graph.addEdge(r, { source: exampleId(1), target: exampleId(2) });
      graph.addEdge(r, { source: exampleId(1), target: exampleId(3) });
      graph.addEdge(r, { source: exampleId(1), target: exampleId(4) });
      const edges = r.get(graph.edges(exampleId(1)));
      expect(edges.outbound).toEqual([exampleId(2), exampleId(3), exampleId(4)]);
    }

    {
      graph.sortEdges(r, exampleId(1), 'outbound', [exampleId(3), exampleId(2)]);
      const edges = r.get(graph.edges(exampleId(1)));
      expect(edges.outbound).toEqual([exampleId(3), exampleId(2), exampleId(4)]);
    }
  });

  test('remove edge', () => {
    const r = Registry.make();
    const graph = new Graph();

    {
      graph.addEdge(r, { source: exampleId(1), target: exampleId(2) });
      const edges = r.get(graph.edges(exampleId(1)));
      expect(edges.inbound).toEqual([]);
      expect(edges.outbound).toEqual([exampleId(2)]);
    }

    {
      graph.removeEdge(r, { source: exampleId(1), target: exampleId(2) });
      const edges = r.get(graph.edges(exampleId(1)));
      expect(edges.inbound).toEqual([]);
      expect(edges.outbound).toEqual([]);
    }
  });

  test('get nodes', () => {
    const r = Registry.make();
    const graph = new Graph();
    graph.addNode(r, { id: exampleId(1), type: EXAMPLE_TYPE });
    graph.addNode(r, { id: exampleId(2), type: EXAMPLE_TYPE });
    graph.addEdge(r, { source: exampleId(1), target: exampleId(2) });
    const nodes = r.get(graph.connections(exampleId(1)));
    expect(nodes).has.length(1);
    expect(nodes[0].id).toEqual(exampleId(2));
  });

  test('can subscribe to a node before it exists', async () => {
    const r = Registry.make();
    const graph = new Graph();
    const nodeKey = graph.node(exampleId(1));

    let node: Option.Option<Node> = Option.none();
    const cancel = r.subscribe(nodeKey, (n) => {
      node = n;
    });
    onTestFinished(() => cancel());

    expect(node).toEqual(Option.none());
    graph.addNode(r, { id: exampleId(1), type: EXAMPLE_TYPE });
    assert.ok(Option.isSome(node));
    expect(node.value.id).toEqual(exampleId(1));
  });

  test('connections updates', () => {
    const r = Registry.make();
    const graph = new Graph();
    assert.strictEqual(graph.connections(exampleId(1)), graph.connections(exampleId(1)));
    const childrenKey = graph.connections(exampleId(1));

    let count = 0;
    const cancel = r.subscribe(childrenKey, (_) => {
      count++;
    });
    onTestFinished(() => cancel());

    graph.addNode(r, { id: exampleId(1), type: EXAMPLE_TYPE });
    graph.addNode(r, { id: exampleId(2), type: EXAMPLE_TYPE });
    graph.addEdge(r, { source: exampleId(1), target: exampleId(2) });

    expect(count).toEqual(0);
    const children = r.get(childrenKey);
    expect(children).has.length(1);
    expect(children[0].id).toEqual(exampleId(2));
    expect(count).toEqual(1);

    // Updating an existing node fires an update.
    graph.addNode(r, { id: exampleId(2), type: EXAMPLE_TYPE, data: 'updated' });
    expect(count).toEqual(2);

    // Adding a node with no changes does not fire an update.
    graph.addNode(r, { id: exampleId(2), type: EXAMPLE_TYPE, data: 'updated' });
    expect(count).toEqual(2);

    // Adding an unconnected node does not fire an update.
    graph.addNode(r, { id: exampleId(3), type: EXAMPLE_TYPE });
    expect(count).toEqual(2);

    // Connecting a node fires an update.
    graph.addEdge(r, { source: exampleId(1), target: exampleId(3) });
    expect(count).toEqual(3);

    // Adding an edge connected to nothing fires an update.
    // TODO(wittjosiah): Is there a way to avoid this?
    graph.addEdge(r, { source: exampleId(1), target: exampleId(4) });
    expect(count).toEqual(4);

    // Adding a node to an existing edge fires an update.
    graph.addNode(r, { id: exampleId(4), type: EXAMPLE_TYPE });
    expect(count).toEqual(5);

    // Batching the edge and node updates fires a single update.
    Rx.batch(() => {
      graph.addEdge(r, { source: exampleId(1), target: exampleId(6) });
      graph.addNode(r, { id: exampleId(6), type: EXAMPLE_TYPE });
    });
    expect(count).toEqual(6);
  });
});
