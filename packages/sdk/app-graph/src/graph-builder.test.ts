//
// Copyright 2023 DXOS.org
//

import { Atom, Registry } from '@effect-atom/atom-react';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';
import { describe, expect, onTestFinished, test } from 'vitest';

import { Trigger } from '@dxos/async';
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
    test('works', async () => {
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
      await GraphBuilder.flush(builder);

      const outbound = registry.get(graph.connections(Node.RootId));
      const inbound = registry.get(graph.connections(Node.RootId, 'inbound'));

      expect(outbound).has.length(1);
      expect(outbound[0].id).to.equal('child');
      expect(outbound[0].data).to.equal(2);
      expect(inbound).has.length(1);
      expect(inbound[0].id).to.equal('parent');
      expect(inbound[0].data).to.equal(0);
    });

    test('updates', async () => {
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
      await GraphBuilder.flush(builder);

      {
        const [node] = registry.get(graph.connections(Node.RootId));
        expect(node.data).to.equal(0);
      }

      {
        registry.set(state, 1);
        await GraphBuilder.flush(builder);
        const [node] = registry.get(graph.connections(Node.RootId));
        expect(node.data).to.equal(1);
      }
    });

    test('subscribes to updates', async () => {
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
      await GraphBuilder.flush(builder);
      expect(count).to.equal(2);

      registry.set(state, 1);
      await GraphBuilder.flush(builder);
      expect(count).to.equal(3);
    });

    test('updates with new extensions', async () => {
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
      await GraphBuilder.flush(builder);

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
      await GraphBuilder.flush(builder);
      expect(nodes).has.length(2);
      expect(count).to.equal(2);
    });

    test('removes', async () => {
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
      await GraphBuilder.flush(builder);

      {
        const nodes = registry.get(graph.connections(Node.RootId));
        expect(nodes).has.length(2);
        expect(nodes[0].id).to.equal(exampleId(1));
        expect(nodes[1].id).to.equal(exampleId(2));
      }

      registry.set(nodes, [{ id: exampleId(3), type: EXAMPLE_TYPE }]);
      await GraphBuilder.flush(builder);

      {
        const nodes = registry.get(graph.connections(Node.RootId));
        expect(nodes).has.length(1);
        expect(nodes[0].id).to.equal(exampleId(3));
      }
    });

    test('nodes are updated when removed', async () => {
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
      await GraphBuilder.flush(builder);
      expect(count).to.equal(0);
      expect(exists).to.be.false;

      registry.set(name, 'default');
      await GraphBuilder.flush(builder);
      expect(count).to.equal(1);
      expect(exists).to.be.true;

      registry.set(name, 'removed');
      await GraphBuilder.flush(builder);
      expect(count).to.equal(2);
      expect(exists).to.be.false;

      registry.set(name, 'added');
      await GraphBuilder.flush(builder);
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
      await GraphBuilder.flush(builder);

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
      await GraphBuilder.flush(builder);

      {
        const nodes = registry.get(graph.connections(Node.RootId));
        expect(nodes).has.length(3);
        expect(nodes[0].id).to.equal(exampleId(3));
        expect(nodes[1].id).to.equal(exampleId(1));
        expect(nodes[2].id).to.equal(exampleId(2));
      }
    });

    test('updates are constrained', async () => {
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
      await GraphBuilder.flush(builder);
      expect(parentCount).to.equal(1);
      expect(independentCount).to.equal(0);
      expect(dependentCount).to.equal(0);

      // Counts should increment when the node is expanded.
      Graph.expand(graph, EXAMPLE_ID);
      await GraphBuilder.flush(builder);
      expect(parentCount).to.equal(1);
      expect(independentCount).to.equal(1);
      expect(dependentCount).to.equal(1);

      // Only dependent count should increment when the parent changes.
      registry.set(name, 'updated');
      await GraphBuilder.flush(builder);
      expect(parentCount).to.equal(2);
      expect(independentCount).to.equal(1);
      expect(dependentCount).to.equal(2);

      // Only independent count should increment when its state changes.
      registry.set(sub, 'updated');
      await GraphBuilder.flush(builder);
      expect(parentCount).to.equal(2);
      expect(independentCount).to.equal(2);
      expect(dependentCount).to.equal(2);

      // Independent count should update if its state changes even if the parent is removed.
      Atom.batch(() => {
        registry.set(name, 'removed');
        registry.set(sub, 'batch');
      });
      await GraphBuilder.flush(builder);
      expect(parentCount).to.equal(2);
      expect(independentCount).to.equal(3);
      expect(dependentCount).to.equal(2);

      // Dependent count should increment when the node is added back.
      registry.set(name, 'added');
      await GraphBuilder.flush(builder);
      expect(parentCount).to.equal(3);
      expect(independentCount).to.equal(3);
      expect(dependentCount).to.equal(3);

      // Counts should not increment when the node is expanded again.
      Graph.expand(graph, EXAMPLE_ID);
      await GraphBuilder.flush(builder);
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
      test('creates connector with type inference', async () => {
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
        await GraphBuilder.flush(builder);

        const connections = registry.get(graph.connections(Node.RootId));
        expect(connections).has.length(1);
        expect(connections[0].id).to.equal('child');
      });
    });

    describe('createExtension', () => {
      test('works with Effect connector', async () => {
        const registry = Registry.make();
        const builder = GraphBuilder.make({ registry });
        const graph = builder.graph;

        const extensions = Effect.runSync(
          GraphBuilder.createExtension({
            id: 'test-extension',
            match: NodeMatcher.whenNodeType(EXAMPLE_TYPE),
            connector: (node, get) => Effect.succeed([{ id: 'child', type: EXAMPLE_TYPE, data: node.data }]),
          }),
        );

        GraphBuilder.addExtension(builder, extensions);

        const writableGraph = graph as Graph.WritableGraph;
        Graph.addNode(writableGraph, { id: 'parent', type: EXAMPLE_TYPE, properties: {}, data: 'test' });
        Graph.expand(graph, 'parent');
        await GraphBuilder.flush(builder);

        const connections = registry.get(graph.connections('parent'));
        expect(connections).has.length(1);
        expect(connections[0].id).to.equal('child');
        expect(connections[0].data).to.equal('test');
      });

      test('works with Effect actions', async () => {
        const registry = Registry.make();
        const builder = GraphBuilder.make({ registry });
        const graph = builder.graph;

        const extensions = Effect.runSync(
          GraphBuilder.createExtension({
            id: 'test-extension',
            match: NodeMatcher.whenNodeType(EXAMPLE_TYPE),
            actions: (node, get) =>
              Effect.succeed([
                {
                  id: 'test-action',
                  data: () =>
                    Effect.sync(() => {
                      console.log('TestAction');
                    }),
                  properties: { label: 'Test' },
                },
              ]),
          }),
        );

        GraphBuilder.addExtension(builder, extensions);

        const writableGraph = graph as Graph.WritableGraph;
        Graph.addNode(writableGraph, { id: 'parent', type: EXAMPLE_TYPE, properties: {}, data: 'test' });
        Graph.expand(graph, 'parent');
        await GraphBuilder.flush(builder);

        const actions = registry.get(graph.actions('parent'));
        expect(actions).has.length(1);
        expect(actions[0].id).to.equal('test-action');
      });

      test('_actionContext captures and provides services to action execution', async () => {
        const registry = Registry.make();
        const builder = GraphBuilder.make({ registry });
        const graph = builder.graph;

        // Define a test service using Context.GenericTag pattern.
        interface TestServiceInterface {
          getValue(): number;
        }
        const TestService = Context.GenericTag<TestServiceInterface>('TestService');

        // Track whether the action was executed with the correct context.
        let executionResult: number | null = null;

        // Create extension with service requirement.
        // Note: The actions callback must USE the service for R to be inferred correctly.
        const extensions = Effect.runSync(
          GraphBuilder.createExtension({
            id: 'test-extension',
            match: NodeMatcher.whenNodeType(EXAMPLE_TYPE),
            actions: (node, get) =>
              // Use TestService in the callback to include it in R.
              Effect.gen(function* () {
                const service = yield* TestService;
                return [
                  {
                    id: 'test-action',
                    data: () =>
                      Effect.gen(function* () {
                        // Action can use the same service from captured context.
                        const svc = yield* TestService;
                        executionResult = svc.getValue();
                      }).pipe(Effect.asVoid),
                    properties: { label: `Test ${service.getValue()}` },
                  },
                ];
              }),
          }).pipe(Effect.provideService(TestService, { getValue: () => 42 })),
        );

        GraphBuilder.addExtension(builder, extensions);

        const writableGraph = graph as Graph.WritableGraph;
        Graph.addNode(writableGraph, { id: 'parent', type: EXAMPLE_TYPE, properties: {}, data: 'test' });
        Graph.expand(graph, 'parent');
        await GraphBuilder.flush(builder);

        const actions = registry.get(graph.actions('parent'));
        expect(actions).has.length(1);

        // Verify _actionContext is captured.
        const action = actions[0] as Node.Action;
        expect(action._actionContext).to.not.be.undefined;

        // Execute the action with the captured context.
        const actionEffect = action.data();
        const effectWithContext = action._actionContext
          ? actionEffect.pipe(Effect.provide(action._actionContext))
          : actionEffect;

        Effect.runSync(effectWithContext);

        // Verify the service was accessible during execution.
        expect(executionResult).to.equal(42);
      });

      test('works with resolver', async () => {
        const registry = Registry.make();
        const builder = GraphBuilder.make({ registry });
        const graph = builder.graph;

        const extensions = Effect.runSync(
          GraphBuilder.createExtension({
            id: 'test-extension',
            match: NodeMatcher.whenNodeType(EXAMPLE_TYPE),
            resolver: (id, get) => Effect.succeed({ id, type: EXAMPLE_TYPE, properties: {}, data: 'resolved' }),
          }),
        );

        GraphBuilder.addExtension(builder, extensions);
        await Graph.initialize(graph, EXAMPLE_ID);

        const node = Graph.getNode(graph, EXAMPLE_ID).pipe(Option.getOrNull);
        expect(node).to.not.be.null;
        expect(node?.id).to.equal(EXAMPLE_ID);
        expect(node?.data).to.equal('resolved');
      });

      test('works with connector and actions together', async () => {
        const registry = Registry.make();
        const builder = GraphBuilder.make({ registry });
        const graph = builder.graph;

        const extensions = Effect.runSync(
          GraphBuilder.createExtension({
            id: 'test-extension',
            match: NodeMatcher.whenNodeType(EXAMPLE_TYPE),
            connector: (node, get) => Effect.succeed([{ id: 'child', type: EXAMPLE_TYPE, data: node.data }]),
            actions: (node, get) =>
              Effect.succeed([
                {
                  id: 'test-action',
                  data: () =>
                    Effect.sync(() => {
                      console.log('TestAction');
                    }),
                  properties: { label: 'Test' },
                },
              ]),
          }),
        );

        GraphBuilder.addExtension(builder, extensions);

        const writableGraph = graph as Graph.WritableGraph;
        Graph.addNode(writableGraph, { id: 'parent', type: EXAMPLE_TYPE, properties: {}, data: 'test' });
        Graph.expand(graph, 'parent');
        await GraphBuilder.flush(builder);

        const connections = registry.get(graph.connections('parent'));
        // Should have both the child node and the action node.
        expect(connections.length).to.be.greaterThanOrEqual(1);
        const childNode = connections.find((n) => n.id === 'child');
        expect(childNode).to.not.be.undefined;
        expect(childNode?.data).to.equal('test');

        const actions = registry.get(graph.actions('parent'));
        expect(actions).has.length(1);
        expect(actions[0].id).to.equal('test-action');
      });

      test('works with reactive connector using get context', async () => {
        const registry = Registry.make();
        const builder = GraphBuilder.make({ registry });
        const graph = builder.graph;

        const state = Atom.make('initial');

        const extensions = Effect.runSync(
          GraphBuilder.createExtension({
            id: 'test-extension',
            match: NodeMatcher.whenNodeType(EXAMPLE_TYPE),
            connector: (node, get) => Effect.succeed([{ id: 'child', type: EXAMPLE_TYPE, data: get(state) }]),
          }),
        );

        GraphBuilder.addExtension(builder, extensions);

        const writableGraph = graph as Graph.WritableGraph;
        Graph.addNode(writableGraph, { id: 'parent', type: EXAMPLE_TYPE, properties: {}, data: 'test' });
        Graph.expand(graph, 'parent');
        await GraphBuilder.flush(builder);

        {
          const connections = registry.get(graph.connections('parent'));
          expect(connections).has.length(1);
          expect(connections[0].data).to.equal('initial');
        }

        registry.set(state, 'updated');
        await GraphBuilder.flush(builder);

        {
          const connections = registry.get(graph.connections('parent'));
          expect(connections).has.length(1);
          expect(connections[0].data).to.equal('updated');
        }
      });
    });

    describe('extension error handling', () => {
      test('connector failure is caught and logged, returns empty array', async () => {
        const registry = Registry.make();
        const builder = GraphBuilder.make({ registry });
        const graph = builder.graph;

        const extensions = Effect.runSync(
          GraphBuilder.createExtension({
            id: 'failing-extension',
            match: NodeMatcher.whenNodeType(EXAMPLE_TYPE),
            connector: (node, get) => Effect.fail(new Error('Connector failed intentionally')),
          }),
        );

        GraphBuilder.addExtension(builder, extensions);

        const writableGraph = graph as Graph.WritableGraph;
        Graph.addNode(writableGraph, { id: 'parent', type: EXAMPLE_TYPE, properties: {}, data: 'test' });

        // Should not throw, error is caught internally.
        Graph.expand(graph, 'parent');
        await GraphBuilder.flush(builder);

        // Should return empty connections since the connector failed.
        const connections = registry.get(graph.connections('parent'));
        expect(connections).has.length(0);
      });

      test('actions failure is caught and logged, returns empty array', async () => {
        const registry = Registry.make();
        const builder = GraphBuilder.make({ registry });
        const graph = builder.graph;

        const extensions = Effect.runSync(
          GraphBuilder.createExtension({
            id: 'failing-actions-extension',
            match: NodeMatcher.whenNodeType(EXAMPLE_TYPE),
            actions: (node, get) => Effect.fail(new Error('Actions failed intentionally')),
          }),
        );

        GraphBuilder.addExtension(builder, extensions);

        const writableGraph = graph as Graph.WritableGraph;
        Graph.addNode(writableGraph, { id: 'parent', type: EXAMPLE_TYPE, properties: {}, data: 'test' });

        // Should not throw, error is caught internally.
        Graph.expand(graph, 'parent');
        await GraphBuilder.flush(builder);

        // Should return empty actions since the actions callback failed.
        const actions = registry.get(graph.actions('parent'));
        expect(actions).has.length(0);
      });

      test('resolver failure is caught and logged, returns null', async () => {
        const registry = Registry.make();
        const builder = GraphBuilder.make({ registry });
        const graph = builder.graph;

        const extensions = Effect.runSync(
          GraphBuilder.createExtension({
            id: 'failing-resolver-extension',
            match: NodeMatcher.whenNodeType(EXAMPLE_TYPE),
            resolver: (id, get) => Effect.fail(new Error('Resolver failed intentionally')),
          }),
        );

        GraphBuilder.addExtension(builder, extensions);

        // Should not throw, error is caught internally.
        await Graph.initialize(graph, EXAMPLE_ID);

        // Should return null/none since the resolver failed.
        const node = Graph.getNode(graph, EXAMPLE_ID).pipe(Option.getOrNull);
        expect(node).to.be.null;
      });

      test('failing extension does not affect other extensions', async () => {
        const registry = Registry.make();
        const builder = GraphBuilder.make({ registry });
        const graph = builder.graph;

        // Add a failing extension.
        const failingExtensions = Effect.runSync(
          GraphBuilder.createExtension({
            id: 'failing-extension',
            match: NodeMatcher.whenNodeType(EXAMPLE_TYPE),
            connector: (node, get) => Effect.fail(new Error('This one fails')),
          }),
        );

        // Add a working extension.
        const workingExtensions = Effect.runSync(
          GraphBuilder.createExtension({
            id: 'working-extension',
            match: NodeMatcher.whenNodeType(EXAMPLE_TYPE),
            connector: (node, get) =>
              Effect.succeed([{ id: 'child-from-working', type: EXAMPLE_TYPE, data: 'success' }]),
          }),
        );

        GraphBuilder.addExtension(builder, failingExtensions);
        GraphBuilder.addExtension(builder, workingExtensions);

        const writableGraph = graph as Graph.WritableGraph;
        Graph.addNode(writableGraph, { id: 'parent', type: EXAMPLE_TYPE, properties: {}, data: 'test' });
        Graph.expand(graph, 'parent');
        await GraphBuilder.flush(builder);

        // The working extension should still produce its node.
        const connections = registry.get(graph.connections('parent'));
        expect(connections).has.length(1);
        expect(connections[0].id).to.equal('child-from-working');
        expect(connections[0].data).to.equal('success');
      });
    });

    describe('createTypeExtension', () => {
      test('creates extension matching by schema type with inferred object type', async () => {
        const registry = Registry.make();
        const builder = GraphBuilder.make({ registry });
        const graph = builder.graph;

        const extensions = Effect.runSync(
          GraphBuilder.createTypeExtension({
            id: 'type-extension',
            type: TestSchema.Person,
            connector: (object) => Effect.succeed([{ id: 'child', type: EXAMPLE_TYPE, data: object }]),
          }),
        );

        GraphBuilder.addExtension(builder, extensions);

        const writableGraph = graph as Graph.WritableGraph;
        const testObject = Obj.make(TestSchema.Person, { name: 'Test' });
        Graph.addNode(writableGraph, { id: 'parent', type: EXAMPLE_TYPE, properties: {}, data: testObject });
        Graph.expand(graph, 'parent');
        await GraphBuilder.flush(builder);

        const connections = registry.get(graph.connections('parent'));
        expect(connections).has.length(1);
        expect(connections[0].id).to.equal('child');
        expect(connections[0].data).to.equal(testObject);
      });
    });
  });
});
