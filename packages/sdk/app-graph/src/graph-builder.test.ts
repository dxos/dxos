//
// Copyright 2023 DXOS.org
//

import { Atom, Registry } from '@effect-atom/atom-react';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';
import { describe, expect, onTestFinished, test } from 'vitest';

import { Trigger, sleep } from '@dxos/async';

import { ROOT_ID } from './graph';
import { createExtension, make } from './graph-builder';
import { type Node } from './node';

const exampleId = (id: number) => `dx:test:${id}`;
const EXAMPLE_ID = exampleId(1);
const EXAMPLE_TYPE = 'dxos.org/type/example';

describe('GraphBuilder', () => {
  describe('resolver', () => {
    test('works', async () => {
      const registry = Registry.make();
      const builder = make({ registry });
      const graph = builder.graph;

      {
        const node = graph.getNode(EXAMPLE_ID).pipe(Option.getOrNull);
        expect(node).to.be.null;
      }

      builder.addExtension(
        createExtension({
          id: 'resolver',
          resolver: () => {
            console.log('resolver');
            return Atom.make({ id: EXAMPLE_ID, type: EXAMPLE_TYPE, data: 1 });
          },
        }),
      );
      await graph.initialize(EXAMPLE_ID);

      {
        const node = graph.getNode(EXAMPLE_ID).pipe(Option.getOrNull);
        expect(node?.id).to.equal(EXAMPLE_ID);
        expect(node?.type).to.equal(EXAMPLE_TYPE);
        expect(node?.data).to.equal(1);
      }
    });

    test('updates', async () => {
      const registry = Registry.make();
      const builder = make({ registry });
      const name = Atom.make('default');
      builder.addExtension(
        createExtension({
          id: 'resolver',
          resolver: () => Atom.make((get) => ({ id: EXAMPLE_ID, type: EXAMPLE_TYPE, data: get(name) })),
        }),
      );
      const graph = builder.graph;
      await graph.initialize(EXAMPLE_ID);

      {
        const node = graph.getNode(EXAMPLE_ID).pipe(Option.getOrNull);
        expect(node?.data).to.equal('default');
      }

      registry.set(name, 'updated');

      {
        const node = graph.getNode(EXAMPLE_ID).pipe(Option.getOrNull);
        expect(node?.data).to.equal('updated');
      }
    });
  });

  describe('connector', () => {
    test('works', () => {
      const registry = Registry.make();
      const builder = make({ registry });
      builder.addExtension(
        createExtension({
          id: 'outbound-connector',
          connector: () => Atom.make([{ id: 'child', type: EXAMPLE_TYPE, data: 2 }]),
        }),
      );
      builder.addExtension(
        createExtension({
          id: 'inbound-connector',
          relation: 'inbound',
          connector: () => Atom.make([{ id: 'parent', type: EXAMPLE_TYPE, data: 0 }]),
        }),
      );

      const graph = builder.graph;
      graph.expand(ROOT_ID);
      graph.expand(ROOT_ID, 'inbound');

      const outbound = registry.get(graph.connections(ROOT_ID));
      const inbound = registry.get(graph.connections(ROOT_ID, 'inbound'));

      expect(outbound).has.length(1);
      expect(outbound[0].id).to.equal('child');
      expect(outbound[0].data).to.equal(2);
      expect(inbound).has.length(1);
      expect(inbound[0].id).to.equal('parent');
      expect(inbound[0].data).to.equal(0);
    });

    test('updates', () => {
      const registry = Registry.make();
      const builder = make({ registry });
      const state = Atom.make(0);
      builder.addExtension(
        createExtension({
          id: 'connector',
          connector: () => Atom.make((get) => [{ id: EXAMPLE_ID, type: EXAMPLE_TYPE, data: get(state) }]),
        }),
      );
      const graph = builder.graph;
      graph.expand(ROOT_ID);

      {
        const [node] = registry.get(graph.connections(ROOT_ID));
        expect(node.data).to.equal(0);
      }

      {
        registry.set(state, 1);
        const [node] = registry.get(graph.connections(ROOT_ID));
        expect(node.data).to.equal(1);
      }
    });

    test('subscribes to updates', () => {
      const registry = Registry.make();
      const builder = make({ registry });
      const state = Atom.make(0);
      builder.addExtension(
        createExtension({
          id: 'connector',
          connector: () => Atom.make((get) => [{ id: EXAMPLE_ID, type: EXAMPLE_TYPE, data: get(state) }]),
        }),
      );
      const graph = builder.graph;

      let count = 0;
      const cancel = registry.subscribe(graph.connections(ROOT_ID), (_) => {
        count++;
      });
      onTestFinished(() => cancel());

      expect(count).to.equal(0);
      expect(registry.get(graph.connections(ROOT_ID))).to.have.length(0);
      expect(count).to.equal(1);

      graph.expand(ROOT_ID);
      expect(count).to.equal(2);
      registry.set(state, 1);
      expect(count).to.equal(3);
    });

    test('updates with new extensions', () => {
      const registry = Registry.make();
      const builder = make({ registry });
      builder.addExtension(
        createExtension({
          id: 'connector',
          connector: () => Atom.make([{ id: EXAMPLE_ID, type: EXAMPLE_TYPE }]),
        }),
      );
      const graph = builder.graph;
      graph.expand(ROOT_ID);

      let nodes: Node[] = [];
      let count = 0;
      const cancel = registry.subscribe(graph.connections(ROOT_ID), (_nodes) => {
        count++;
        nodes = _nodes;
      });
      onTestFinished(() => cancel());

      expect(nodes).has.length(0);
      expect(count).to.equal(0);
      registry.get(graph.connections(ROOT_ID));
      expect(nodes).has.length(1);
      expect(count).to.equal(1);

      builder.addExtension(
        createExtension({
          id: 'connector-2',
          connector: () => Atom.make([{ id: exampleId(2), type: EXAMPLE_TYPE }]),
        }),
      );
      expect(nodes).has.length(2);
      expect(count).to.equal(2);
    });

    test('removes', () => {
      const registry = Registry.make();
      const builder = make({ registry });
      const nodes = Atom.make([
        { id: exampleId(1), type: EXAMPLE_TYPE },
        { id: exampleId(2), type: EXAMPLE_TYPE },
      ]);
      builder.addExtension(
        createExtension({
          id: 'connector',
          connector: () => Atom.make((get) => get(nodes)),
        }),
      );
      const graph = builder.graph;
      graph.expand(ROOT_ID);

      {
        const nodes = registry.get(graph.connections(ROOT_ID));
        expect(nodes).has.length(2);
        expect(nodes[0].id).to.equal(exampleId(1));
        expect(nodes[1].id).to.equal(exampleId(2));
      }

      registry.set(nodes, [{ id: exampleId(3), type: EXAMPLE_TYPE }]);

      {
        const nodes = registry.get(graph.connections(ROOT_ID));
        expect(nodes).has.length(1);
        expect(nodes[0].id).to.equal(exampleId(3));
      }
    });

    test('nodes are updated when removed', () => {
      const registry = Registry.make();
      const builder = make({ registry });
      const name = Atom.make('removed');

      builder.addExtension([
        createExtension({
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

      graph.expand(ROOT_ID);
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
      const builder = make({ registry });
      const nodes = Atom.make([
        { id: exampleId(1), type: EXAMPLE_TYPE, data: 1 },
        { id: exampleId(2), type: EXAMPLE_TYPE, data: 2 },
        { id: exampleId(3), type: EXAMPLE_TYPE, data: 3 },
      ]);
      builder.addExtension(
        createExtension({
          id: 'connector',
          connector: () => Atom.make((get) => get(nodes)),
        }),
      );
      const graph = builder.graph;
      graph.expand(ROOT_ID);

      {
        const nodes = registry.get(graph.connections(ROOT_ID));
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
        const nodes = registry.get(graph.connections(ROOT_ID));
        expect(nodes).has.length(3);
        expect(nodes[0].id).to.equal(exampleId(3));
        expect(nodes[1].id).to.equal(exampleId(1));
        expect(nodes[2].id).to.equal(exampleId(2));
      }
    });

    test('updates are constrained', () => {
      const registry = Registry.make();
      const builder = make({ registry });
      const name = Atom.make('default');
      const sub = Atom.make('default');

      builder.addExtension([
        createExtension({
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
        createExtension({
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
        createExtension({
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
      graph.expand(ROOT_ID);
      expect(parentCount).to.equal(1);
      expect(independentCount).to.equal(0);
      expect(dependentCount).to.equal(0);

      // Counts should increment when the node is expanded.
      graph.expand(EXAMPLE_ID);
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
      graph.expand(EXAMPLE_ID);
      expect(parentCount).to.equal(3);
      expect(independentCount).to.equal(3);
      expect(dependentCount).to.equal(3);
    });

    test('eager graph expansion', async () => {
      const registry = Registry.make();
      const builder = make({ registry });
      builder.addExtension(
        createExtension({
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
        builder.graph.expand(id);
        count++;
        if (count === 5) {
          trigger.wake();
        }
      });

      builder.graph.expand(ROOT_ID);
      await trigger.wait();
      expect(count).to.equal(5);
    });
  });

  describe('explore', () => {
    test('works', async () => {
      const builder = make();
      builder.addExtension(
        createExtension({
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
      await builder.explore({
        visitor: () => {
          count++;
        },
      });

      expect(count).to.equal(6);
    });
  });
});
