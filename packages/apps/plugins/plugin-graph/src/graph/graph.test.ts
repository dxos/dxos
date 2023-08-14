//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { SessionGraph } from './graph';
import { GraphActionBuilder, GraphNode, GraphNodeAction, GraphNodeBuilder } from './types';

describe.only('SessionGraph', () => {
  test('returns root node', () => {
    const graph = new SessionGraph();
    expect(graph.root).to.not.be.undefined;
    expect(graph.root.id).to.equal('root');
  });

  test('root node unmodified without builders', () => {
    const graph = new SessionGraph();
    graph.construct();
    expect(graph.root.attributes).to.be.empty;
    expect(graph.root.children).to.be.empty;
    expect(graph.root.actions).to.be.empty;
  });

  test('builder can add children to root node', () => {
    const graph = new SessionGraph();
    const testNode = { id: 'test', data: null, parent: graph.root, attributes: {}, children: {}, actions: {} };
    graph.registerNodeBuilder('test', (parent) => (parent.id === 'root' ? [testNode] : []));
    graph.construct();
    expect(graph.root.children['test:test']).to.equal(testNode);
  });

  test('builder can add actions to root node', () => {
    const graph = new SessionGraph();
    const testAction = { id: 'test', intent: { action: 'test' } };
    graph.registerActionBuilder('test', (parent) => (parent.id === 'root' ? [testAction] : []));
    graph.construct();
    expect(graph.root.actions['test:test']).to.equal(testAction);
  });

  test('multiple builders can add children to root node', () => {
    const graph = new SessionGraph();
    const [builder1, cache1] = createTestNodeBuilder('test1');
    const [builder2, cache2] = createTestNodeBuilder('test2');
    graph.registerNodeBuilder('test1', builder1);
    graph.registerNodeBuilder('test2', builder2);
    graph.construct();

    expect(Array.from(cache1.keys())).to.deep.equal(['root']);
    expect(Array.from(cache2.keys())).to.deep.equal(['root']);

    for (const node of cache1.get('root')!) {
      expect(graph.root).to.equal(node.parent);
      expect(graph.find(node.id)).to.equal(node);
    }
    for (const node of cache2.get('root')!) {
      expect(graph.root).to.equal(node.parent);
      expect(graph.find(node.id)).to.equal(node);
    }
  });

  test('multiple plugins can add actions to root node', () => {
    const graph = new SessionGraph();
    const [builder1, cache1] = createTestActionBuilder('test1');
    const [builder2, cache2] = createTestActionBuilder('test2');
    graph.registerActionBuilder('test1', builder1);
    graph.registerActionBuilder('test2', builder2);
    graph.construct();

    expect(Array.from(cache1.keys())).to.deep.equal(['root']);
    expect(Array.from(cache2.keys())).to.deep.equal(['root']);

    for (const action of cache1.get('root')!) {
      expect(graph.root.actions['test1:root-test1']).to.equal(action);
    }
    for (const action of cache2.get('root')!) {
      expect(graph.root.actions['test2:root-test2']).to.equal(action);
    }
  });

  test('builders can add children to child node', () => {
    const graph = new SessionGraph();
    const [builder1, cache1] = createTestNodeBuilder('test1', 2);
    const [builder2, cache2] = createTestNodeBuilder('test2');
    graph.registerNodeBuilder('test1', builder1);
    graph.registerNodeBuilder('test2', builder2);
    graph.construct();

    expect(Array.from(cache1.keys())).to.deep.equal(['root', 'root-test1', 'root-test2']);
    expect(Array.from(cache2.keys())).to.deep.equal(['root']);

    for (const key of cache1.keys()) {
      const parent = graph.find(key);
      for (const node of cache1.get(key)!) {
        expect(parent).to.equal(node.parent);
        expect(graph.find(node.id)).to.equal(node);
      }
    }
    for (const node of cache2.get('root')!) {
      expect(graph.root).to.equal(node.parent);
      expect(graph.find(node.id)).to.equal(node);
    }
  });

  test('plugin can add actions to child node', () => {
    const graph = new SessionGraph();
    const [builder1, cache1] = createTestActionBuilder('test1', 2);
    const [builder2, cache2] = createTestActionBuilder('test2');
    graph.registerNodeBuilder('test', createTestNodeBuilder('test', 2)[0]);
    graph.registerActionBuilder('test1', builder1);
    graph.registerActionBuilder('test2', builder2);
    graph.construct();

    expect(Array.from(cache1.keys())).to.deep.equal(['root', 'root-test']);
    expect(Array.from(cache2.keys())).to.deep.equal(['root']);

    for (const key of cache1.keys()) {
      const parent = graph.find(key);
      for (const action of cache1.get(key)!) {
        expect(parent!.actions[`test1:${key}-test1`]).to.equal(action);
      }
    }
    for (const action of cache2.get('root')!) {
      expect(graph.root.actions['test2:root-test2']).to.equal(action);
    }
  });

  test('graph is updated on invalidation', async () => {
    const graph = new SessionGraph();
    const [builder1, cache1] = createTestNodeBuilder('test1', 2);
    graph.registerNodeBuilder('test1', builder1);
    graph.construct();

    expect(graph.find('root-test1')).to.equal(cache1.get('root')![0]);
    expect(graph.find('root-test1-test1')).to.equal(cache1.get('root-test1')![0]);

    cache1.get('root')![0].id = 'root-test11';
    graph.invalidate('root-test1');

    expect(graph.find('root-test11')).to.equal(cache1.get('root')![0]);
    expect(graph.find('root-test11-test1')).to.equal(cache1.get('root-test11')![0]);
  });
});

const checkDepth = (node: GraphNode, depth = 0): number => {
  if (!node.parent) {
    return depth;
  }

  return checkDepth(node.parent, depth + 1);
};

const createTestNodeBuilder = (id: string, depth = 1): [GraphNodeBuilder, Map<string, GraphNode[]>] => {
  const cache = new Map<string, GraphNode[]>();
  const builder = (parent: GraphNode): GraphNode[] => {
    if (checkDepth(parent) >= depth) {
      return [];
    }

    let nodes = cache.get(parent.id);
    if (!nodes) {
      nodes = [
        {
          id: `${parent.id}-${id}`,
          data: null,
          parent,
          attributes: {},
          children: {},
          actions: {},
        },
      ];
      cache.set(parent.id, nodes);
    }

    return nodes;
  };

  return [builder, cache];
};

const createTestActionBuilder = (id: string, depth = 1): [GraphActionBuilder, Map<string, GraphNodeAction[]>] => {
  const cache = new Map<string, GraphNodeAction[]>();
  const builder = (parent: GraphNode): GraphNodeAction[] => {
    if (checkDepth(parent) >= depth) {
      return [];
    }

    let actions = cache.get(parent.id);
    if (!actions) {
      actions = [
        {
          id: `${parent.id}-${id}`,
          intent: { action: 'test' },
        },
      ];
      cache.set(parent.id, actions);
    }

    return actions;
  };

  return [builder, cache];
};
