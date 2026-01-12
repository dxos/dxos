//
// Copyright 2023 DXOS.org
//

import { Atom, Registry } from '@effect-atom/atom-react';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';
import { describe, expect, onTestFinished, test } from 'vitest';

import { Trigger, sleep } from '@dxos/async';
import { Obj } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';

import * as Graph from './graph';
import * as GraphBuilder from './graph-builder';
import * as Node from './node';
import * as NodeMatcher from './node-matcher';

const exampleId = (id: number) => `dx:test:${id}`;
const EXAMPLE_ID = exampleId(1);
const EXAMPLE_TYPE = 'dxos.org/type/example';

describe('GraphBuilder', () => {
  describe('resolver', () => {
    test('works', async () => {
      const registry = Registry.make();
      const builder = GraphBuilder.make({ registry });
      const graph = builder.graph;

      {
        const node = Graph.getNode(graph, EXAMPLE_ID).pipe(Option.getOrNull);
        expect(node).to.be.null;
      }

      // Test direct API
      GraphBuilder.addExtension(
        builder,
        GraphBuilder.createExtensionRaw({
          id: 'resolver',
          resolver: () => {
            console.log('resolver');
            return Atom.make({ id: EXAMPLE_ID, type: EXAMPLE_TYPE, data: 1 });
          },
        }),
      );
      await Graph.initialize(graph, EXAMPLE_ID);

      {
        const node = Graph.getNode(graph, EXAMPLE_ID).pipe(Option.getOrNull);
        expect(node?.id).to.equal(EXAMPLE_ID);
        expect(node?.type).to.equal(EXAMPLE_TYPE);
        expect(node?.data).to.equal(1);
      }
    });

    test('updates', async () => {
      const registry = Registry.make();
      const builder = GraphBuilder.make({ registry });
      const name = Atom.make('default');
      GraphBuilder.addExtension(
        builder,
        GraphBuilder.createExtensionRaw({
          id: 'resolver',
          resolver: () => Atom.make((get) => ({ id: EXAMPLE_ID, type: EXAMPLE_TYPE, data: get(name) })),
        }),
      );
      const graph = builder.graph;
      await Graph.initialize(graph, EXAMPLE_ID);

      {
        const node = Graph.getNode(graph, EXAMPLE_ID).pipe(Option.getOrNull);
        expect(node?.data).to.equal('default');
      }

      registry.set(name, 'updated');

      {
        const node = Graph.getNode(graph, EXAMPLE_ID).pipe(Option.getOrNull);
        expect(node?.data).to.equal('updated');
      }
    });
  });

  describe('connector', () => {
    test('works', () => {
      const registry = Registry.make();
      const builder = GraphBuilder.make({ registry });
      GraphBuilder.addExtension(
        builder,
        GraphBuilder.createExtensionRaw({
          id: 'outbound-connector',
          connector: () => Atom.make([{ id: 'child', type: EXAMPLE_TYPE, data: 2 }]),
        }),
      );
      GraphBuilder.addExtension(
        builder,
        GraphBuilder.createExtensionRaw({
          id: 'inbound-connector',
          relation: 'inbound',
          connector: () => Atom.make([{ id: 'parent', type: EXAMPLE_TYPE, data: 0 }]),
        }),
      );

      const graph = builder.graph;
      Graph.expand(graph, Node.RootId);
      Graph.expand(graph, Node.RootId, 'inbound');

      const outbound = registry.get(graph.connections(Node.RootId));
      const inbound = registry.get(graph.connections(Node.RootId, 'inbound'));

      expect(outbound).has.length(1);
      expect(outbound[0].id).to.equal('child');
      expect(outbound[0].data).to.equal(2);
      expect(inbound).has.length(1);
      expect(inbound[0].id).to.equal('parent');
      expect(inbound[0].data).to.equal(0);
    });

    test('updates', () => {
      const registry = Registry.make();
      const builder = GraphBuilder.make({ registry });
      const state = Atom.make(0);
      GraphBuilder.addExtension(
        builder,
        GraphBuilder.createExtensionRaw({
          id: 'connector',
          connector: () => Atom.make((get) => [{ id: EXAMPLE_ID, type: EXAMPLE_TYPE, data: get(state) }]),
        }),
      );
      const graph = builder.graph;
      Graph.expand(graph, Node.RootId);

      {
        const [node] = registry.get(graph.connections(Node.RootId));
        expect(node.data).to.equal(0);
      }

      {
        registry.set(state, 1);
        const [node] = registry.get(graph.connections(Node.RootId));
        expect(node.data).to.equal(1);
      }
    });

    test('subscribes to updates', () => {
      const registry = Registry.make();
      const builder = GraphBuilder.make({ registry });
      const state = Atom.make(0);
      GraphBuilder.addExtension(
        builder,
        GraphBuilder.createExtensionRaw({
          id: 'connector',
          connector: () => Atom.make((get) => [{ id: EXAMPLE_ID, type: EXAMPLE_TYPE, data: get(state) }]),
        }),
      );
      const graph = builder.graph;

      let count = 0;
      const cancel = registry.subscribe(graph.connections(Node.RootId), (_) => {
        count++;
      });
      onTestFinished(() => cancel());

      expect(count).to.equal(0);
      expect(registry.get(graph.connections(Node.RootId))).to.have.length(0);
      expect(count).to.equal(1);

      Graph.expand(graph, Node.RootId);
      expect(count).to.equal(2);
      registry.set(state, 1);
      expect(count).to.equal(3);
    });

    test('updates with new extensions', () => {
      const registry = Registry.make();
      const builder = GraphBuilder.make({ registry });
      GraphBuilder.addExtension(
        builder,
        GraphBuilder.createExtensionRaw({
          id: 'connector',
          connector: () => Atom.make([{ id: EXAMPLE_ID, type: EXAMPLE_TYPE }]),
        }),
      );
      const graph = builder.graph;
      Graph.expand(graph, Node.RootId);

      let nodes: Node.Node[] = [];
      let count = 0;
      const cancel = registry.subscribe(graph.connections(Node.RootId), (_nodes) => {
        count++;
        nodes = _nodes;
      });
      onTestFinished(() => cancel());

      expect(nodes).has.length(0);
      expect(count).to.equal(0);
      registry.get(graph.connections(Node.RootId));
      expect(nodes).has.length(1);
      expect(count).to.equal(1);

      GraphBuilder.addExtension(
        builder,
        GraphBuilder.createExtensionRaw({
          id: 'connector-2',
          connector: () => Atom.make([{ id: exampleId(2), type: EXAMPLE_TYPE }]),
        }),
      );
      expect(nodes).has.length(2);
      expect(count).to.equal(2);
    });

    test('removes', () => {
      const registry = Registry.make();
      const builder = GraphBuilder.make({ registry });
      const nodes = Atom.make([
        { id: exampleId(1), type: EXAMPLE_TYPE },
        { id: exampleId(2), type: EXAMPLE_TYPE },
      ]);
      GraphBuilder.addExtension(
        builder,
        GraphBuilder.createExtensionRaw({
          id: 'connector',
          connector: () => Atom.make((get) => get(nodes)),
        }),
      );
      const graph = builder.graph;
      Graph.expand(graph, Node.RootId);

      {
        const nodes = registry.get(graph.connections(Node.RootId));
        expect(nodes).has.length(2);
        expect(nodes[0].id).to.equal(exampleId(1));
        expect(nodes[1].id).to.equal(exampleId(2));
      }

      registry.set(nodes, [{ id: exampleId(3), type: EXAMPLE_TYPE }]);

      {
        const nodes = registry.get(graph.connections(Node.RootId));
        expect(nodes).has.length(1);
        expect(nodes[0].id).to.equal(exampleId(3));
      }
    });

    test('nodes are updated when removed', () => {
      const registry = Registry.make();
      const builder = GraphBuilder.make({ registry });
      const name = Atom.make('removed');

      GraphBuilder.addExtension(builder, [
        GraphBuilder.createExtensionRaw({
          id: 'root',
          connector: (node) =>
            Atom.make((get) =>
              Function.pipe(
                get(node),
                Option.flatMap((node) => (node.id === 'root' ? Option.some(get(name)) : Option.none())),
                Option.filter((name) => name !== 'removed'),
                Option.map((name) => [{ id: EXAMPLE_ID, type: EXAMPLE_TYPE, data: name }]),
                Option.getOrElse(() => []),
              ),
            ),
        }),
      ]);

      const graph = builder.graph;

      let count = 0;
      let exists = false;
      const cancel = registry.subscribe(graph.node(EXAMPLE_ID), (node) => {
        count++;
        exists = Option.isSome(node);
      });
      onTestFinished(() => cancel());

      Graph.expand(graph, Node.RootId);
      expect(count).to.equal(0);
      expect(exists).to.be.false;

      registry.set(name, 'default');
      expect(count).to.equal(1);
      expect(exists).to.be.true;

      registry.set(name, 'removed');
      expect(count).to.equal(2);
      expect(exists).to.be.false;

      registry.set(name, 'added');
      expect(count).to.equal(3);
      expect(exists).to.be.true;
    });

    test('sort edges', async () => {
      const registry = Registry.make();
      const builder = GraphBuilder.make({ registry });
      const nodes = Atom.make([
        { id: exampleId(1), type: EXAMPLE_TYPE, data: 1 },
        { id: exampleId(2), type: EXAMPLE_TYPE, data: 2 },
        { id: exampleId(3), type: EXAMPLE_TYPE, data: 3 },
      ]);
      GraphBuilder.addExtension(
        builder,
        GraphBuilder.createExtensionRaw({
          id: 'connector',
          connector: () => Atom.make((get) => get(nodes)),
        }),
      );
      const graph = builder.graph;
      Graph.expand(graph, Node.RootId);

      {
        const nodes = registry.get(graph.connections(Node.RootId));
        expect(nodes).has.length(3);
        expect(nodes[0].id).to.equal(exampleId(1));
        expect(nodes[1].id).to.equal(exampleId(2));
        expect(nodes[2].id).to.equal(exampleId(3));
      }

      registry.set(nodes, [
        { id: exampleId(3), type: EXAMPLE_TYPE, data: 3 },
        { id: exampleId(1), type: EXAMPLE_TYPE, data: 1 },
        { id: exampleId(2), type: EXAMPLE_TYPE, data: 2 },
      ]);

      // TODO(wittjosiah): Why is this needed for the following conditions to pass?
      await sleep(0);

      {
        const nodes = registry.get(graph.connections(Node.RootId));
        expect(nodes).has.length(3);
        expect(nodes[0].id).to.equal(exampleId(3));
        expect(nodes[1].id).to.equal(exampleId(1));
        expect(nodes[2].id).to.equal(exampleId(2));
      }
    });

    test('updates are constrained', () => {
      const registry = Registry.make();
      const builder = GraphBuilder.make({ registry });
      const name = Atom.make('default');
      const sub = Atom.make('default');

      GraphBuilder.addExtension(builder, [
        GraphBuilder.createExtensionRaw({
          id: 'root',
          connector: (node) =>
            Atom.make((get) =>
              Function.pipe(
                get(node),
                Option.flatMap((node) => (node.id === 'root' ? Option.some(get(name)) : Option.none())),
                Option.filter((name) => name !== 'removed'),
                Option.map((name) => [{ id: EXAMPLE_ID, type: EXAMPLE_TYPE, data: name }]),
                Option.getOrElse(() => []),
              ),
            ),
        }),
        GraphBuilder.createExtensionRaw({
          id: 'connector1',
          connector: (node) =>
            Atom.make((get) =>
              Function.pipe(
                get(node),
                Option.flatMap((node) => (node.id === EXAMPLE_ID ? Option.some(get(sub)) : Option.none())),
                Option.map((sub) => [{ id: exampleId(2), type: EXAMPLE_TYPE, data: sub }]),
                Option.getOrElse(() => []),
              ),
            ),
        }),
        GraphBuilder.createExtensionRaw({
          id: 'connector2',
          connector: (node) =>
            Atom.make((get) =>
              Function.pipe(
                get(node),
                Option.flatMap((node) => (node.id === EXAMPLE_ID ? Option.some(node.data) : Option.none())),
                Option.map((data) => [{ id: exampleId(3), type: EXAMPLE_TYPE, data }]),
                Option.getOrElse(() => []),
              ),
            ),
        }),
      ]);

      const graph = builder.graph;

      let parentCount = 0;
      const parentCancel = registry.subscribe(graph.node(EXAMPLE_ID), (_) => {
        parentCount++;
      });
      onTestFinished(() => parentCancel());

      let independentCount = 0;
      const independentCancel = registry.subscribe(graph.node(exampleId(2)), (_) => {
        independentCount++;
      });
      onTestFinished(() => independentCancel());

      let dependentCount = 0;
      const dependentCancel = registry.subscribe(graph.node(exampleId(3)), (_) => {
        dependentCount++;
      });
      onTestFinished(() => dependentCancel());

      // Counts should not increment until the node is expanded.
      Graph.expand(graph, Node.RootId);
      expect(parentCount).to.equal(1);
      expect(independentCount).to.equal(0);
      expect(dependentCount).to.equal(0);

      // Counts should increment when the node is expanded.
      Graph.expand(graph, EXAMPLE_ID);
      expect(parentCount).to.equal(1);
      expect(independentCount).to.equal(1);
      expect(dependentCount).to.equal(1);

      // Only dependent count should increment when the parent changes.
      registry.set(name, 'updated');
      expect(parentCount).to.equal(2);
      expect(independentCount).to.equal(1);
      expect(dependentCount).to.equal(2);

      // Only independent count should increment when its state changes.
      registry.set(sub, 'updated');
      expect(parentCount).to.equal(2);
      expect(independentCount).to.equal(2);
      expect(dependentCount).to.equal(2);

      // Independent count should update if its state changes even if the parent is removed.
      Atom.batch(() => {
        registry.set(name, 'removed');
        registry.set(sub, 'batch');
      });
      expect(parentCount).to.equal(2);
      expect(independentCount).to.equal(3);
      expect(dependentCount).to.equal(2);

      // Dependent count should increment when the node is added back.
      registry.set(name, 'added');
      expect(parentCount).to.equal(3);
      expect(independentCount).to.equal(3);
      expect(dependentCount).to.equal(3);

      // Counts should not increment when the node is expanded again.
      Graph.expand(graph, EXAMPLE_ID);
      expect(parentCount).to.equal(3);
      expect(independentCount).to.equal(3);
      expect(dependentCount).to.equal(3);
    });

    test('eager graph expansion', async () => {
      const registry = Registry.make();
      const builder = GraphBuilder.make({ registry });
      GraphBuilder.addExtension(
        builder,
        GraphBuilder.createExtensionRaw({
          id: 'connector',
          connector: (node) => {
            return Atom.make((get) =>
              Function.pipe(
                get(node),
                Option.map((node) => (node.data ? node.data + 1 : 1)),
                Option.filter((data) => data <= 5),
                Option.map((data) => [{ id: `node-${data}`, type: EXAMPLE_TYPE, data }]),
                Option.getOrElse(() => []),
              ),
            );
          },
        }),
      );

      let count = 0;
      const trigger = new Trigger();
      builder.graph.onNodeChanged.on(({ id }) => {
        Graph.expand(builder.graph, id);
        count++;
        if (count === 5) {
          trigger.wake();
        }
      });

      Graph.expand(builder.graph, Node.RootId);
      await trigger.wait();
      expect(count).to.equal(5);
    });
  });

  describe('explore', () => {
    test('works', async () => {
      const builder = GraphBuilder.make();
      GraphBuilder.addExtension(
        builder,
        GraphBuilder.createExtensionRaw({
          id: 'connector',
          connector: (node) =>
            Atom.make((get) =>
              Function.pipe(
                get(node),
                Option.map((node) => (node.data ? node.data + 1 : 1)),
                Option.filter((data) => data <= 5),
                Option.map((data) => [{ id: `node-${data}`, type: EXAMPLE_TYPE, data }]),
                Option.getOrElse(() => []),
              ),
            ),
        }),
      );

      let count = 0;
      await GraphBuilder.explore(builder, {
        visitor: () => {
          count++;
        },
      });

      expect(count).to.equal(6);
    });
  });

  describe('helpers', () => {
    describe('createConnector', () => {
      test('creates connector with type inference', () => {
        const registry = Registry.make();
        const builder = GraphBuilder.make({ registry });
        const graph = builder.graph;

        const matcher = (node: Node.Node) => NodeMatcher.whenId('root')(node);
        const factory = (node: Node.Node) => [{ id: 'child', type: EXAMPLE_TYPE, data: node.id }];

        const connector = GraphBuilder.createConnector(matcher, factory);

        GraphBuilder.addExtension(
          builder,
          GraphBuilder.createExtensionRaw({
            id: 'test-connector',
            connector,
          }),
        );

        Graph.expand(graph, Node.RootId);

        const connections = registry.get(graph.connections(Node.RootId));
        expect(connections).has.length(1);
        expect(connections[0].id).to.equal('child');
      });
    });

    describe('createExtension', () => {
      test('works with plain function connector', () => {
        const registry = Registry.make();
        const builder = GraphBuilder.make({ registry });
        const graph = builder.graph;

        const extensions = GraphBuilder.createExtension({
          id: 'test-extension',
          match: NodeMatcher.whenNodeType(EXAMPLE_TYPE),
          connector: (node, get) => [{ id: 'child', type: EXAMPLE_TYPE, data: node.data }],
        });

        GraphBuilder.addExtension(builder, extensions);

        const writableGraph = graph as Graph.WritableGraph;
        Graph.addNode(writableGraph, { id: 'parent', type: EXAMPLE_TYPE, properties: {}, data: 'test' });
        Graph.expand(graph, 'parent');

        const connections = registry.get(graph.connections('parent'));
        expect(connections).has.length(1);
        expect(connections[0].id).to.equal('child');
        expect(connections[0].data).to.equal('test');
      });

      test('works with plain function actions', () => {
        const registry = Registry.make();
        const builder = GraphBuilder.make({ registry });
        const graph = builder.graph;

        const extensions = GraphBuilder.createExtension({
          id: 'test-extension',
          match: NodeMatcher.whenNodeType(EXAMPLE_TYPE),
          actions: (node, get) => [
            {
              id: 'test-action',
              data: async () => {
                console.log('TestAction');
              },
              properties: { label: 'Test' },
            },
          ],
        });

        GraphBuilder.addExtension(builder, extensions);

        const writableGraph = graph as Graph.WritableGraph;
        Graph.addNode(writableGraph, { id: 'parent', type: EXAMPLE_TYPE, properties: {}, data: 'test' });
        Graph.expand(graph, 'parent');

        const actions = registry.get(graph.actions('parent'));
        expect(actions).has.length(1);
        expect(actions[0].id).to.equal('test-action');
      });

      test('works with resolver', async () => {
        const registry = Registry.make();
        const builder = GraphBuilder.make({ registry });
        const graph = builder.graph;

        const extensions = GraphBuilder.createExtension({
          id: 'test-extension',
          match: NodeMatcher.whenNodeType(EXAMPLE_TYPE),
          resolver: (id, get) => ({ id, type: EXAMPLE_TYPE, properties: {}, data: 'resolved' }),
        });

        GraphBuilder.addExtension(builder, extensions);
        await Graph.initialize(graph, EXAMPLE_ID);

        const node = Graph.getNode(graph, EXAMPLE_ID).pipe(Option.getOrNull);
        expect(node).to.not.be.null;
        expect(node?.id).to.equal(EXAMPLE_ID);
        expect(node?.data).to.equal('resolved');
      });

      test('works with connector and actions together', () => {
        const registry = Registry.make();
        const builder = GraphBuilder.make({ registry });
        const graph = builder.graph;

        const extensions = GraphBuilder.createExtension({
          id: 'test-extension',
          match: NodeMatcher.whenNodeType(EXAMPLE_TYPE),
          connector: (node, get) => [{ id: 'child', type: EXAMPLE_TYPE, data: node.data }],
          actions: (node, get) => [
            {
              id: 'test-action',
              data: async () => {
                console.log('TestAction');
              },
              properties: { label: 'Test' },
            },
          ],
        });

        GraphBuilder.addExtension(builder, extensions);

        const writableGraph = graph as Graph.WritableGraph;
        Graph.addNode(writableGraph, { id: 'parent', type: EXAMPLE_TYPE, properties: {}, data: 'test' });
        Graph.expand(graph, 'parent');

        const connections = registry.get(graph.connections('parent'));
        // Should have both the child node and the action node
        expect(connections.length).to.be.greaterThanOrEqual(1);
        const childNode = connections.find((n) => n.id === 'child');
        expect(childNode).to.not.be.undefined;
        expect(childNode?.data).to.equal('test');

        const actions = registry.get(graph.actions('parent'));
        expect(actions).has.length(1);
        expect(actions[0].id).to.equal('test-action');
      });

      test('works with reactive connector using get context', () => {
        const registry = Registry.make();
        const builder = GraphBuilder.make({ registry });
        const graph = builder.graph;

        const state = Atom.make('initial');

        const extensions = GraphBuilder.createExtension({
          id: 'test-extension',
          match: NodeMatcher.whenNodeType(EXAMPLE_TYPE),
          connector: (node, get) => [{ id: 'child', type: EXAMPLE_TYPE, data: get(state) }],
        });

        GraphBuilder.addExtension(builder, extensions);

        const writableGraph = graph as Graph.WritableGraph;
        Graph.addNode(writableGraph, { id: 'parent', type: EXAMPLE_TYPE, properties: {}, data: 'test' });
        Graph.expand(graph, 'parent');

        {
          const connections = registry.get(graph.connections('parent'));
          expect(connections).has.length(1);
          expect(connections[0].data).to.equal('initial');
        }

        registry.set(state, 'updated');

        {
          const connections = registry.get(graph.connections('parent'));
          expect(connections).has.length(1);
          expect(connections[0].data).to.equal('updated');
        }
      });
    });

    describe('createTypeExtension', () => {
      test('creates extension matching by schema type with inferred object type', () => {
        const registry = Registry.make();
        const builder = GraphBuilder.make({ registry });
        const graph = builder.graph;

        const extensions = GraphBuilder.createTypeExtension({
          id: 'type-extension',
          type: TestSchema.Person,
          connector: (object) => {
            return [{ id: 'child', type: EXAMPLE_TYPE, data: object }];
          },
        });

        GraphBuilder.addExtension(builder, extensions);

        const writableGraph = graph as Graph.WritableGraph;
        const testObject = Obj.make(TestSchema.Person, { name: 'Test' });
        Graph.addNode(writableGraph, { id: 'parent', type: EXAMPLE_TYPE, properties: {}, data: testObject });
        Graph.expand(graph, 'parent');

        const connections = registry.get(graph.connections('parent'));
        expect(connections).has.length(1);
        expect(connections[0].id).to.equal('child');
        expect(connections[0].data).to.equal(testObject);
      });
    });
  });
});
