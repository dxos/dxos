//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { SessionGraph } from './graph';
import { Graph } from './types';

describe.only('SessionGraph', () => {
  test('returns root node', () => {
    const graph = new SessionGraph();
    expect(graph.root).to.not.be.undefined;
    expect(graph.root.id).to.equal('root');
  });

  test('root node unmodified without builders', () => {
    const graph = new SessionGraph();
    graph.construct();
    expect(graph.root.properties).to.be.empty;
    expect(graph.root.children).to.be.empty;
    expect(graph.root.actions).to.be.empty;
  });

  test('builder can add children to root node', () => {
    const graph = new SessionGraph();
    const testNode = { id: 'test', label: 'Test', data: null };
    graph.registerNodeBuilder((parent) => {
      if (parent.id === 'root') {
        parent.add(testNode);
      }
    });
    graph.construct();
    expect(graph.root.childrenMap.test.id).to.equal(testNode.id);
    expect(graph.root.childrenMap.test.parent!.id).to.equal(graph.root.id);
  });

  test('builder can add actions to root node', () => {
    const graph = new SessionGraph();
    const testAction = { id: 'test', label: 'Test', intent: { action: 'test' } };
    graph.registerNodeBuilder((parent) => {
      if (parent.id === 'root') {
        parent.addAction(testAction);
      }
    });
    graph.construct();
    expect(graph.root.actionsMap.test.id).to.equal(testAction.id);
  });

  test('multiple builders can add children to root node', () => {
    const graph = new SessionGraph();
    graph.registerNodeBuilder(createTestNodeBuilder('test1').builder);
    graph.registerNodeBuilder(createTestNodeBuilder('test2').builder);
    graph.construct();

    expect(Object.keys(graph.root.childrenMap)).to.deep.equal(['root-test1', 'root-test2']);

    for (const node of graph.root.children) {
      expect(graph.root.id).to.equal(node.parent!.id);
    }
  });

  test('multiple builders can add actions to root node', () => {
    const graph = new SessionGraph();
    graph.registerNodeBuilder(createTestNodeBuilder('test1').builder);
    graph.registerNodeBuilder(createTestNodeBuilder('test2').builder);
    graph.construct();

    expect(Object.keys(graph.root.actionsMap)).to.deep.equal(['root-test1', 'root-test2']);
  });

  test('builders can add children to child node', () => {
    const graph = new SessionGraph();
    graph.registerNodeBuilder(createTestNodeBuilder('test1', 2).builder);
    graph.registerNodeBuilder(createTestNodeBuilder('test2').builder);
    graph.construct();

    expect(Object.keys(graph.root.childrenMap['root-test1'].children)).to.be.empty;
    expect(Object.keys(graph.root.childrenMap['root-test2'].childrenMap)).to.deep.equal(['root-test2-test1']);

    for (const node of graph.root.childrenMap['root-test2'].children) {
      expect(graph.root.childrenMap['root-test2'].id).to.equal(node.parent!.id);
    }
  });

  test('builders can add actions to child node', () => {
    const graph = new SessionGraph();
    graph.registerNodeBuilder(createTestNodeBuilder('test1', 2).builder);
    graph.registerNodeBuilder(createTestNodeBuilder('test2').builder);
    graph.construct();

    expect(Object.keys(graph.root.childrenMap['root-test1'].actionsMap)).to.be.empty;
    expect(Object.keys(graph.root.childrenMap['root-test2'].actionsMap)).to.deep.equal(['root-test2-test1']);
  });

  test('builders can add actions to action sets', () => {
    const graph = new SessionGraph();
    graph.registerNodeBuilder((parent) => {
      const [set] = parent.addAction({ id: 'test-set', label: 'Test Set' });
      set.add({ id: 'test-action', label: 'Test', intent: { action: 'test' } });
    });
    graph.construct();

    expect(Object.keys(graph.root.actionsMap['test-set'].actionsMap)).to.deep.equal(['test-action']);
  });

  test('is updated when nodes change', async () => {
    const graph = new SessionGraph();
    const { builder, addNode, removeNode, addAction, removeAction, addProperty, removeProperty } =
      createTestNodeBuilder('test1', 2);
    graph.registerNodeBuilder(builder);
    graph.construct();

    expect(graph.root.children).to.have.length(1);
    addNode('root', { id: 'root-test2', label: 'root-test2' });
    expect(graph.root.children).to.have.length(2);
    expect(graph.root.childrenMap['root-test2'].children).to.have.length(0);

    expect(graph.root.childrenMap['root-test1'].children).to.have.length(0);
    addNode('root-test1', { id: 'root-test1-test2', label: 'root-test1-test2' });
    expect(graph.root.childrenMap['root-test1'].children).to.have.length(1);
    expect(graph.root.childrenMap['root-test1'].childrenMap['root-test1-test2'].children).to.have.length(0);

    expect(graph.root.actions).to.have.length(1);
    addAction('root', { id: 'root-test2', label: 'root-test2', intent: { action: 'test' } });
    expect(graph.root.actions).to.have.length(2);

    expect(graph.root.childrenMap['root-test1'].properties).to.not.have.property('test');
    addProperty('root-test1', 'test', 'test');
    expect(graph.root.childrenMap['root-test1'].properties.test).to.equal('test');

    expect(graph.root.children).to.have.length(2);
    removeNode('root', 'root-test2');
    expect(graph.root.children).to.have.length(1);

    expect(graph.root.childrenMap['root-test1'].children).to.have.length(1);
    removeNode('root-test1', 'root-test1-test2');
    expect(graph.root.childrenMap['root-test1'].children).to.have.length(0);

    expect(graph.root.actions).to.have.length(2);
    removeAction('root', 'root-test2');
    expect(graph.root.actions).to.have.length(1);

    expect(graph.root.childrenMap['root-test1'].properties.test).to.equal('test');
    removeProperty('root-test1', 'test');
    expect(graph.root.childrenMap['root-test1'].properties).to.not.have.property('test');
  });

  test.skip('node builder unsubscribe is called when builder is re-run', async () => {
    // TODO(wittjosiah): Implement.
  });

  test('can find nodes', () => {
    const graph = new SessionGraph();
    graph.registerNodeBuilder(createTestNodeBuilder('test1', 2).builder);
    graph.registerNodeBuilder(createTestNodeBuilder('test2').builder);
    graph.construct();

    expect(graph.find('root-test1')?.id).to.equal('root-test1');
    expect(graph.find('root-test2-test1')?.id).to.equal('root-test2-test1');
  });

  test('can be traversed', () => {
    const graph = new SessionGraph();
    graph.registerNodeBuilder(createTestNodeBuilder('test1', 2).builder);
    graph.registerNodeBuilder(createTestNodeBuilder('test2').builder);
    graph.construct();

    const nodes: string[] = [];
    graph.traverse({ onVisitNode: (node) => nodes.push(node.id) });
    expect(nodes).to.deep.equal(['root', 'root-test1', 'root-test2', 'root-test2-test1']);
  });

  test('traversal can be limited by predicate', () => {
    const graph = new SessionGraph();
    graph.registerNodeBuilder(createTestNodeBuilder('test1', 2).builder);
    graph.registerNodeBuilder(createTestNodeBuilder('test2').builder);
    graph.construct();

    const nodes: string[] = [];
    graph.traverse({
      predicate: (node) => node.id.includes('test1'),
      onVisitNode: (node) => nodes.push(node.id),
    });
    expect(nodes).to.deep.equal(['root-test1', 'root-test2-test1']);
  });

  test('traversal can be started from any node', () => {
    const graph = new SessionGraph();
    graph.registerNodeBuilder(createTestNodeBuilder('test1', 2).builder);
    graph.registerNodeBuilder(createTestNodeBuilder('test2').builder);
    graph.construct();

    const nodes: string[] = [];
    graph.traverse({
      from: graph.root.childrenMap['root-test2'],
      onVisitNode: (node) => nodes.push(node.id),
    });
    expect(nodes).to.deep.equal(['root-test2', 'root-test2-test1']);
  });

  test('can traverse up', () => {
    const graph = new SessionGraph();
    graph.registerNodeBuilder(createTestNodeBuilder('test1', 2).builder);
    graph.registerNodeBuilder(createTestNodeBuilder('test2').builder);
    graph.construct();

    const nodes: string[] = [];
    graph.traverse({
      direction: 'up',
      from: graph.root.childrenMap['root-test2'].childrenMap['root-test2-test1'],
      onVisitNode: (node) => nodes.push(node.id),
    });
    expect(nodes).to.deep.equal(['root-test2-test1', 'root-test2', 'root']);
  });
});

const checkDepth = (node: Graph.Node, depth = 0): number => {
  if (!node.parent) {
    return depth;
  }

  return checkDepth(node.parent, depth + 1);
};

const createTestNodeBuilder = (id: string, depth = 1) => {
  const nodes = new Map<string, Graph.Node>();
  const builder: Graph.NodeBuilder = (parent) => {
    if (checkDepth(parent) >= depth) {
      return;
    }

    const [child] = parent.add({
      id: `${parent.id}-${id}`,
      label: `${parent.id}-${id}`,
      data: null,
      parent,
    });

    parent.addAction({
      id: `${parent.id}-${id}`,
      label: `${parent.id}-${id}`,
      intent: { action: 'test' },
    });

    nodes.set(parent.id, parent);
    nodes.set(child.id, child);
  };

  const addNode = (parentId: string, node: Pick<Graph.Node, 'id' | 'label'> & Partial<Graph.Node>) => {
    const parent = nodes.get(parentId);
    if (!parent) {
      return;
    }

    const [child] = parent.add(node);
    nodes.set(child.id, child);
    return child;
  };

  const removeNode = (parentId: string, id: string) => {
    const parent = nodes.get(parentId);
    if (!parent) {
      return;
    }

    return parent.remove(id);
  };

  const addAction = (parentId: string, action: Pick<Graph.Action, 'id' | 'label'> & Partial<Graph.Action>) => {
    const parent = nodes.get(parentId);
    if (!parent) {
      return;
    }

    return parent.addAction(action);
  };

  const removeAction = (parentId: string, id: string) => {
    const parent = nodes.get(parentId);
    if (!parent) {
      return;
    }

    return parent.removeAction(id);
  };

  const addProperty = (parentId: string, key: string, value: any) => {
    const parent = nodes.get(parentId);
    if (!parent) {
      return;
    }

    return parent.addProperty(key, value);
  };

  const removeProperty = (parentId: string, key: string) => {
    const parent = nodes.get(parentId);
    if (!parent) {
      return;
    }

    return parent.removeProperty(key);
  };

  return { builder, addNode, removeNode, addAction, removeAction, addProperty, removeProperty };
};
