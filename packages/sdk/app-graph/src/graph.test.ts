//
// Copyright 2023 DXOS.org
//

import { effect } from '@preact/signals-core';
import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { Graph, type Node } from './graph';

const longestPaths = new Map<string, string[]>();

const parseLongestPath = (node: Node, connectedNode: Node) => {
  const longestPath = longestPaths.get(node.id);
  if (!longestPath) {
    return undefined;
  }

  if (longestPath[longestPath.length - 2] !== connectedNode.id) {
    return undefined;
  }

  return node;
};

describe('Graph', () => {
  test('add node', () => {
    const graph = new Graph();

    const [root] = graph.addNode({
      id: 'root',
      nodes: [{ id: 'test1' }, { id: 'test2' }],
    });

    expect(root.id).to.equal('root');
    expect(root.nodes()).to.have.length(2);
    expect(graph.getNode('test1')?.id).to.equal('test1');
    expect(graph.getNode('test2')?.id).to.equal('test2');
    expect(graph.getNode('test1')?.nodes()).to.be.empty;
    expect(graph.getNode('test2')?.nodes()).to.be.empty;
    expect(graph.getNode('test1')?.nodes({ direction: 'inbound' })).to.have.length(1);
    expect(graph.getNode('test2')?.nodes({ direction: 'inbound' })).to.have.length(1);
  });

  test('remove node', () => {
    const graph = new Graph();

    const [root] = graph.addNode({
      id: 'root',
      nodes: [{ id: 'test1' }, { id: 'test2' }],
    });

    expect(root.id).to.equal('root');
    expect(root.nodes()).to.have.length(2);
    expect(graph.getNode('test1')?.id).to.equal('test1');
    expect(graph.getNode('test2')?.id).to.equal('test2');

    graph.removeNode('test1');
    expect(graph.getNode('test1')).to.be.undefined;
    expect(root.nodes()).to.have.length(1);
  });

  test('add edge', () => {
    const graph = new Graph();

    graph.addNode({
      id: 'root',
      nodes: [{ id: 'test1' }, { id: 'test2' }],
    });
    graph.addEdge('test1', 'test2');

    expect(graph.getNode('test1')?.nodes()).to.have.length(1);
    expect(graph.getNode('test2')?.nodes({ direction: 'inbound' })).to.have.length(2);
  });

  test('remove edge', () => {
    const graph = new Graph();

    graph.addNode({
      id: 'root',
      nodes: [{ id: 'test1' }, { id: 'test2' }],
    });
    graph.removeEdge('root', 'test1');

    expect(graph.getNode('root')?.nodes()).to.have.length(1);
    expect(graph.getNode('test1')?.nodes({ direction: 'inbound' })).to.be.empty;
  });

  test('toJSON', () => {
    const graph = new Graph();

    graph.addNode({
      id: 'root',
      nodes: [{ id: 'test1' }, { id: 'test2' }],
    });
    graph.addEdge('test1', 'test2');

    const json = graph.toJSON();
    expect(json).to.deep.equal({
      id: 'root',
      nodes: [{ id: 'test1', nodes: [{ id: 'test2' }] }, { id: 'test2' }],
    });
  });

  test('can be traversed', () => {
    const graph = new Graph();

    const [root] = graph.addNode({
      id: 'root',
      nodes: [{ id: 'test1' }, { id: 'test2' }],
    });

    const nodes: string[] = [];
    graph.traverse({ node: root, visitor: (node) => nodes.push(node.id) });
    expect(nodes).to.deep.equal(['root', 'test1', 'test2']);
  });

  test('traversal can be limited by predicate', () => {
    const graph = new Graph();

    const [root] = graph.addNode({
      id: 'root',
      nodes: [{ id: 'test1' }, { id: 'test2' }, { id: 'test3' }, { id: 'test4' }],
    });

    const nodes: string[] = [];
    graph.traverse({
      node: root,
      visitor: (node) => nodes.push(node.id),
      filter: (node) => {
        try {
          const id = parseInt(node.id.replace('test', ''), 10);
          return id % 2 === 0;
        } catch (e) {
          return false;
        }
      },
    });
    expect(nodes).to.deep.equal(['test2', 'test4']);
  });

  test('traversal can be started from any node', () => {
    const graph = new Graph();

    graph.addNode({
      id: 'root',
      nodes: [{ id: 'test1', nodes: [{ id: 'test2', nodes: [{ id: 'test3' }] }] }],
    });

    const nodes: string[] = [];
    graph.traverse({
      node: graph.getNode('test2')!,
      visitor: (node) => nodes.push(node.id),
    });
    expect(nodes).to.deep.equal(['test2', 'test3']);
  });

  test('traversal can follow inbound edges', () => {
    const graph = new Graph();

    graph.addNode({
      id: 'root',
      nodes: [{ id: 'test1', nodes: [{ id: 'test2', nodes: [{ id: 'test3' }] }] }],
    });

    const nodes: string[] = [];
    graph.traverse({
      node: graph.getNode('test2')!,
      direction: 'inbound',
      visitor: (node) => nodes.push(node.id),
    });
    expect(nodes).to.deep.equal(['test2', 'test1', 'root']);
  });

  test('can filter to longest pathes', () => {
    const graph = new Graph();

    graph.addNode({
      id: 'root',
      nodes: [{ id: 'test1' }, { id: 'test2' }],
    });
    graph.addEdge('test1', 'test2');

    graph.traverse({
      node: graph.getNode('root')!,
      visitor: (node, path) => {
        if (!longestPaths.has(node.id) || longestPaths.get(node.id)!.length < path.length) {
          longestPaths.set(node.id, path);
        }
      },
    });

    expect(longestPaths.get('root')).to.deep.equal(['root']);
    expect(longestPaths.get('test1')).to.deep.equal(['root', 'test1']);
    expect(longestPaths.get('test2')).to.deep.equal(['root', 'test1', 'test2']);
    expect(graph.getNode('root')?.nodes({ parseNode: parseLongestPath })).to.have.length(1);
    expect(graph.getNode('test1')?.nodes({ parseNode: parseLongestPath })).to.have.length(1);
    expect(graph.getNode('test2')?.nodes({ parseNode: parseLongestPath })).to.be.empty;

    longestPaths.clear();
  });

  test('traversing the graph subscribes to changes', () => {
    const graph = new Graph();

    graph.addNode({
      id: 'root',
      nodes: [{ id: 'test1' }, { id: 'test2' }],
    });

    const dispose = effect(() => {
      graph.traverse({
        node: graph.getNode('root')!,
        visitor: (node, path) => {
          if (!longestPaths.has(node.id) || longestPaths.get(node.id)!.length < path.length) {
            longestPaths.set(node.id, path);
          }
        },
      });
    });

    expect(longestPaths.get('root')).to.deep.equal(['root']);
    expect(longestPaths.get('test1')).to.deep.equal(['root', 'test1']);
    expect(longestPaths.get('test2')).to.deep.equal(['root', 'test2']);
    expect(graph.getNode('root')?.nodes({ parseNode: parseLongestPath })).to.have.length(2);
    expect(graph.getNode('test1')?.nodes({ parseNode: parseLongestPath })).to.be.empty;
    expect(graph.getNode('test2')?.nodes({ parseNode: parseLongestPath })).to.be.empty;

    graph.addEdge('test1', 'test2');

    expect(longestPaths.get('root')).to.deep.equal(['root']);
    expect(longestPaths.get('test1')).to.deep.equal(['root', 'test1']);
    expect(longestPaths.get('test2')).to.deep.equal(['root', 'test1', 'test2']);
    expect(graph.getNode('root')?.nodes({ parseNode: parseLongestPath })).to.have.length(1);
    expect(graph.getNode('test1')?.nodes({ parseNode: parseLongestPath })).to.have.length(1);
    expect(graph.getNode('test2')?.nodes({ parseNode: parseLongestPath })).to.be.empty;

    dispose();
    longestPaths.clear();
  });
});
