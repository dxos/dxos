//
// Copyright 2023 DXOS.org
//

import { Registry } from '@effect-rx/rx-react';
import { Option } from 'effect';
import { assert, describe, expect, onTestFinished, test } from 'vitest';

import { invariant } from '@dxos/invariant';

import { getGraph, Graph, ROOT_ID, ROOT_TYPE } from './graph';

const EXAMPLE_TYPE = 'example';

describe('RxGraph', () => {
  test('getGraph', () => {
    const r = Registry.make();
    const graph = new Graph();
    const root = r.get(graph.node(ROOT_ID));
    invariant(Option.isSome(root));
    expect(root.value.id).toEqual(ROOT_ID);
    expect(root.value.type).toEqual(ROOT_TYPE);
    expect(getGraph(root.value)).toEqual(graph);
  });

  test('add node', () => {
    const r = Registry.make();
    const graph = new Graph();
    graph.addNode(r, { id: '1', type: EXAMPLE_TYPE });
    const node = r.get(graph.node('1'));
    expect(Option.isSome(node)).toEqual(true);
    invariant(Option.isSome(node));
    expect(node.value.id).toEqual('1');
    expect(node.value.type).toEqual(EXAMPLE_TYPE);
    expect(node.value.data).toEqual(null);
    expect(node.value.properties).toEqual({});
  });

  test('remove node', () => {
    const r = Registry.make();
    const graph = new Graph();

    {
      const node = r.get(graph.node('1'));
      expect(Option.isNone(node)).toEqual(true);
    }

    {
      graph.addNode(r, { id: '1', type: EXAMPLE_TYPE });
      const node = r.get(graph.node('1'));
      expect(Option.isSome(node)).toEqual(true);
    }

    {
      graph.removeNode(r, '1');
      const node = r.get(graph.node('1'));
      expect(Option.isNone(node)).toEqual(true);
    }
  });

  test('add edge', () => {
    const r = Registry.make();
    const graph = new Graph();
    graph.addEdge(r, { source: '1', target: '2' });
    const edge = r.get(graph.edge('1'));
    expect(edge.inbound).toEqual([]);
    expect(edge.outbound).toEqual(['2']);
  });

  test('remove edge', () => {
    const r = Registry.make();
    const graph = new Graph();

    {
      graph.addEdge(r, { source: '1', target: '2' });
      const edge = r.get(graph.edge('1'));
      expect(edge.inbound).toEqual([]);
      expect(edge.outbound).toEqual(['2']);
    }

    {
      graph.removeEdge(r, { source: '1', target: '2' });
      const edge = r.get(graph.edge('1'));
      expect(edge.inbound).toEqual([]);
      expect(edge.outbound).toEqual([]);
    }
  });

  test('get nodes', () => {
    const r = Registry.make();
    const graph = new Graph();
    graph.addNode(r, { id: '1', type: EXAMPLE_TYPE });
    graph.addNode(r, { id: '2', type: EXAMPLE_TYPE });
    graph.addEdge(r, { source: '1', target: '2' });
    const nodes = r.get(graph.nodes('1'));
    expect(nodes).has.length(1);
    expect(nodes[0].id).toEqual('2');
  });

  test('update node', () => {
    const r = Registry.make();
    const graph = new Graph();
    const nodeKey = graph.node('1');

    let count = 0;
    const cancel = r.subscribe(nodeKey, (_) => {
      count++;
    });
    onTestFinished(() => cancel());

    expect(r.get(nodeKey)).toEqual(Option.none());
    expect(count).toEqual(1);

    expect(r.get(nodeKey)).toEqual(Option.none());
    expect(count).toEqual(1);

    graph.addNode(r, { id: '1', type: EXAMPLE_TYPE });
    const node = r.get(nodeKey);
    expect(Option.isSome(node)).toEqual(true);
    invariant(Option.isSome(node));
    expect(node.value.id).toEqual('1');
    expect(node.value.type).toEqual(EXAMPLE_TYPE);
    expect(node.value.data).toEqual(null);
    expect(node.value.properties).toEqual({});
    expect(count).toEqual(2);

    graph.addNode(r, { id: '1', type: EXAMPLE_TYPE });
    expect(count).toEqual(2);
  });

  test('update nodes', () => {
    const r = Registry.make();
    const graph = new Graph();
    assert.strictEqual(graph.nodes('parent'), graph.nodes('parent'));
    const childrenKey = graph.nodes('parent');

    let count = 0;
    const cancel = r.subscribe(childrenKey, (_) => {
      count++;
    });
    onTestFinished(() => cancel());

    graph.addNode(r, { id: 'parent', type: EXAMPLE_TYPE });
    graph.addNode(r, { id: 'child', type: EXAMPLE_TYPE });
    graph.addEdge(r, { source: 'parent', target: 'child' });

    expect(count).toEqual(0);
    const children = r.get(childrenKey);
    expect(children).has.length(1);
    expect(children[0].id).toEqual('child');
    expect(count).toEqual(1);

    graph.addNode(r, { id: 'child', type: EXAMPLE_TYPE, data: 'updated' });
    expect(count).toEqual(2);
  });
});
