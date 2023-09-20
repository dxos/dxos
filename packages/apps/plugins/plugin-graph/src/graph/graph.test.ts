//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { GraphBuilder } from './graph-builder';
import { createTestNodeBuilder } from './testing';

describe('Graph', () => {
  test('returns root node', () => {
    const graph = new GraphBuilder().build();
    expect(graph.root).to.not.be.undefined;
    expect(graph.root.id).to.equal('root');
  });

  test('root node unmodified without builders', () => {
    const graph = new GraphBuilder().build();
    expect(graph.root.properties).to.be.empty;
    expect(graph.root.children).to.be.empty;
    expect(graph.root.actions).to.be.empty;
  });

  test('builder can add children to root node', () => {
    const builder = new GraphBuilder();
    const testNode = { id: 'test', label: 'Test', data: null };
    builder.registerNodeBuilder((parent) => {
      if (parent.id === 'root') {
        parent.add(testNode);
      }
    });

    const graph = builder.build();
    expect(graph.root.childrenMap.test.id).to.equal(testNode.id);
    expect(graph.root.childrenMap.test.parent!.id).to.equal(graph.root.id);
  });

  test('builder can add actions to root node', () => {
    const builder = new GraphBuilder();
    const testAction = { id: 'test', label: 'Test', intent: { action: 'test' } };
    builder.registerNodeBuilder((parent) => {
      if (parent.id === 'root') {
        parent.addAction(testAction);
      }
    });

    const graph = builder.build();
    expect(graph.root.actionsMap.test.id).to.equal(testAction.id);
  });

  test('multiple builders can add children to root node', () => {
    const builder = new GraphBuilder();
    builder.registerNodeBuilder(createTestNodeBuilder('test1').nodeBuilder);
    builder.registerNodeBuilder(createTestNodeBuilder('test2').nodeBuilder);

    const graph = builder.build();
    expect(Object.keys(graph.root.childrenMap)).to.deep.equal(['root-test1', 'root-test2']);
    for (const node of graph.root.children) {
      expect(graph.root.id).to.equal(node.parent!.id);
    }
  });

  test('multiple builders can add actions to root node', () => {
    const builder = new GraphBuilder();
    builder.registerNodeBuilder(createTestNodeBuilder('test1').nodeBuilder);
    builder.registerNodeBuilder(createTestNodeBuilder('test2').nodeBuilder);

    const graph = builder.build();
    expect(Object.keys(graph.root.actionsMap)).to.deep.equal(['root-test1', 'root-test2']);
  });

  test('builders can add children to child node', () => {
    const builder = new GraphBuilder();
    builder.registerNodeBuilder(createTestNodeBuilder('test1', 2).nodeBuilder);
    builder.registerNodeBuilder(createTestNodeBuilder('test2').nodeBuilder);

    const graph = builder.build();
    expect(Object.keys(graph.root.childrenMap['root-test1'].children)).to.be.empty;
    expect(Object.keys(graph.root.childrenMap['root-test2'].childrenMap)).to.deep.equal(['root-test2-test1']);
    for (const node of graph.root.childrenMap['root-test2'].children) {
      expect(graph.root.childrenMap['root-test2'].id).to.equal(node.parent!.id);
    }
  });

  test('builders can add actions to child node', () => {
    const builder = new GraphBuilder();
    builder.registerNodeBuilder(createTestNodeBuilder('test1', 2).nodeBuilder);
    builder.registerNodeBuilder(createTestNodeBuilder('test2').nodeBuilder);

    const graph = builder.build();
    expect(Object.keys(graph.root.childrenMap['root-test1'].actionsMap)).to.be.empty;
    expect(Object.keys(graph.root.childrenMap['root-test2'].actionsMap)).to.deep.equal(['root-test2-test1']);
  });

  test('builders can add actions to action sets', () => {
    const builder = new GraphBuilder();
    builder.registerNodeBuilder((parent) => {
      const [set] = parent.addAction({ id: 'test-set', label: 'Test Set' });
      set.add({ id: 'test-action', label: 'Test', intent: { action: 'test' } });
    });

    const graph = builder.build();
    expect(Object.keys(graph.root.actionsMap['test-set'].actionsMap)).to.deep.equal(['test-action']);
  });

  test('is updated when nodes change', async () => {
    const builder = new GraphBuilder();

    // TODO(burdon): Return TestNodeBuilder object.
    const { nodeBuilder, addNode, removeNode, addAction, removeAction, addProperty, removeProperty } =
      createTestNodeBuilder('test1', 2);
    builder.registerNodeBuilder(nodeBuilder);

    const graph = builder.build();
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

  // TODO(burdon): Failing (parents are null?)
  test.only('can find nodes', () => {
    const builder = new GraphBuilder();
    builder.registerNodeBuilder(createTestNodeBuilder('test1', 2).nodeBuilder);
    builder.registerNodeBuilder(createTestNodeBuilder('test2').nodeBuilder);

    const graph = builder.build();
    console.log(graph);
    expect(graph.findNode('root-test1')?.id).to.equal('root-test1');
    expect(graph.findNode('root-test2-test1')?.id).to.equal('root-test2-test1');
  });

  test('can be traversed', () => {
    const builder = new GraphBuilder();
    builder.registerNodeBuilder(createTestNodeBuilder('test1', 2).nodeBuilder);
    builder.registerNodeBuilder(createTestNodeBuilder('test2').nodeBuilder);

    const graph = builder.build();
    const nodes: string[] = [];
    graph.traverse({ onVisitNode: (node) => nodes.push(node.id) });
    expect(nodes).to.deep.equal(['root', 'root-test1', 'root-test2', 'root-test2-test1']);
  });

  test('traversal can be limited by predicate', () => {
    const builder = new GraphBuilder();
    builder.registerNodeBuilder(createTestNodeBuilder('test1', 2).nodeBuilder);
    builder.registerNodeBuilder(createTestNodeBuilder('test2').nodeBuilder);

    const graph = builder.build();
    const nodes: string[] = [];
    graph.traverse({
      predicate: (node) => node.id.includes('test1'),
      onVisitNode: (node) => nodes.push(node.id),
    });
    expect(nodes).to.deep.equal(['root-test1', 'root-test2-test1']);
  });

  test('traversal can be started from any node', () => {
    const builder = new GraphBuilder();
    builder.registerNodeBuilder(createTestNodeBuilder('test1', 2).nodeBuilder);
    builder.registerNodeBuilder(createTestNodeBuilder('test2').nodeBuilder);

    const graph = builder.build();
    const nodes: string[] = [];
    graph.traverse({
      from: graph.root.childrenMap['root-test2'],
      onVisitNode: (node) => nodes.push(node.id),
    });
    expect(nodes).to.deep.equal(['root-test2', 'root-test2-test1']);
  });

  test('can traverse up', () => {
    const builder = new GraphBuilder();
    builder.registerNodeBuilder(createTestNodeBuilder('test1', 2).nodeBuilder);
    builder.registerNodeBuilder(createTestNodeBuilder('test2').nodeBuilder);

    const graph = builder.build();
    const nodes: string[] = [];
    graph.traverse({
      direction: 'up',
      from: graph.root.childrenMap['root-test2'].childrenMap['root-test2-test1'],
      onVisitNode: (node) => nodes.push(node.id),
    });
    expect(nodes).to.deep.equal(['root-test2-test1', 'root-test2', 'root']);
  });
});
