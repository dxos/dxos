//
// Copyright 2023 DXOS.org
//

import { Registry, Rx } from '@effect-rx/rx-react';
import { Option, pipe } from 'effect';
import { afterEach, beforeEach, describe, expect, onTestFinished, test } from 'vitest';

import { Trigger } from '@dxos/async';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { Ref } from '@dxos/echo-schema';
import { registerSignalsRuntime } from '@dxos/echo-signals';
import { getDebugName } from '@dxos/util';

import { ROOT_ID } from './graph';
import { createExtension, GraphBuilder, rxFromRef } from './graph-builder';
import { type Node } from '../node';

registerSignalsRuntime();

const exampleId = (id: number) => `dx:test:${id}`;
const EXAMPLE_ID = exampleId(1);
const EXAMPLE_TYPE = 'dxos.org/type/example';

describe('RxGraphBuilder', () => {
  describe('connector', () => {
    test('works', () => {
      const registry = Registry.make();
      const builder = new GraphBuilder({ registry });
      builder.addExtension(
        createExtension({
          id: 'outbound-connector',
          connector: () => [{ id: 'child', type: EXAMPLE_TYPE, data: 2 }],
        }),
      );
      builder.addExtension(
        createExtension({
          id: 'inbound-connector',
          relation: 'inbound',
          connector: () => [{ id: 'parent', type: EXAMPLE_TYPE, data: 0 }],
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
      const builder = new GraphBuilder({ registry });
      const state = Rx.make(0);
      builder.addExtension(
        createExtension({
          id: 'connector',
          connector: ({ get }) => [{ id: EXAMPLE_ID, type: EXAMPLE_TYPE, data: get(state) }],
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
      const builder = new GraphBuilder({ registry });
      const state = Rx.make(0);
      builder.addExtension(
        createExtension({
          id: 'connector',
          connector: ({ get }) => [{ id: EXAMPLE_ID, type: EXAMPLE_TYPE, data: get(state) }],
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
      const builder = new GraphBuilder({ registry });
      builder.addExtension(
        createExtension({
          id: 'connector',
          connector: () => [{ id: EXAMPLE_ID, type: EXAMPLE_TYPE }],
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
          connector: () => [{ id: exampleId(2), type: EXAMPLE_TYPE }],
        }),
      );
      expect(nodes).has.length(2);
      expect(count).to.equal(2);
    });

    test('removes', () => {
      const registry = Registry.make();
      const builder = new GraphBuilder({ registry });
      const nodes = Rx.make([
        { id: exampleId(1), type: EXAMPLE_TYPE },
        { id: exampleId(2), type: EXAMPLE_TYPE },
      ]);
      builder.addExtension(
        createExtension({
          id: 'connector',
          connector: ({ get }) => get(nodes),
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
      const builder = new GraphBuilder({ registry });
      const name = Rx.make('removed');

      builder.addExtension([
        createExtension({
          id: 'root',
          connector: ({ get, node }) =>
            pipe(
              node.id === 'root' ? Option.some(get(name)) : Option.none(),
              Option.filter((name) => name !== 'removed'),
              Option.map((name) => [{ id: EXAMPLE_ID, type: EXAMPLE_TYPE, data: name }]),
              Option.getOrElse(() => []),
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

    test('updates are constrained', () => {
      const registry = Registry.make();
      const builder = new GraphBuilder({ registry });
      const name = Rx.make('default');
      const sub = Rx.make('default');

      builder.addExtension([
        createExtension({
          id: 'root',
          connector: ({ get, node }) =>
            pipe(
              node.id === 'root' ? Option.some(get(name)) : Option.none(),
              Option.filter((name) => name !== 'removed'),
              Option.map((name) => [{ id: EXAMPLE_ID, type: EXAMPLE_TYPE, data: name }]),
              Option.getOrElse(() => []),
            ),
        }),
        createExtension({
          id: 'connector1',
          connector: ({ get, node }) =>
            pipe(
              node.id === EXAMPLE_ID ? Option.some(get(sub)) : Option.none(),
              Option.map((sub) => [{ id: exampleId(2), type: EXAMPLE_TYPE, data: sub }]),
              Option.getOrElse(() => []),
            ),
        }),
        createExtension({
          id: 'connector2',
          connector: ({ get, node }) =>
            pipe(
              node.id === EXAMPLE_ID ? Option.some(node.data) : Option.none(),
              Option.map((data) => [{ id: exampleId(3), type: EXAMPLE_TYPE, data }]),
              Option.getOrElse(() => []),
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

      graph.expand(ROOT_ID);
      graph.expand(EXAMPLE_ID);
      expect(parentCount).to.equal(1);
      expect(independentCount).to.equal(1);
      expect(dependentCount).to.equal(1);

      registry.set(sub, 'one');
      expect(parentCount).to.equal(1);
      expect(independentCount).to.equal(2);
      expect(dependentCount).to.equal(1);

      registry.set(sub, 'two');
      expect(parentCount).to.equal(1);
      expect(independentCount).to.equal(3);
      expect(dependentCount).to.equal(1);

      registry.set(sub, 'three');
      expect(parentCount).to.equal(1);
      expect(independentCount).to.equal(4);
      expect(dependentCount).to.equal(1);

      registry.set(name, 'name');
      expect(parentCount).to.equal(2);
      expect(independentCount).to.equal(4);
      expect(dependentCount).to.equal(2);

      registry.set(sub, 'four');
      expect(parentCount).to.equal(2);
      expect(independentCount).to.equal(5);
      expect(dependentCount).to.equal(2);
    });

    test.skip('updates are constrained failing 1', () => {
      const registry = Registry.make();
      const builder = new GraphBuilder({ registry });
      const name = Rx.make('default');
      const sub = Rx.make('default');

      builder.addExtension([
        createExtension({
          id: 'root',
          // map: (get, key) =>
          //   Option.match(get(key), {
          //     onSome: (node) => (node.id === 'root' ? get(name) : undefined),
          //     onNone: () => undefined,
          //   }),
          // connector: (_, name) => (name === 'removed' ? [] : [{ id: EXAMPLE_ID, type: EXAMPLE_TYPE, data: name }]),
          connector: ({ get, node }) =>
            pipe(
              node.id === 'root' ? Option.some(get(name)) : Option.none(),
              Option.filter((name) => name !== 'removed'),
              Option.map((name) => [{ id: EXAMPLE_ID, type: EXAMPLE_TYPE, data: name }]),
              Option.getOrElse(() => []),
            ),
        }),
        createExtension({
          id: 'connector1',
          // map: (get, key) =>
          //   Option.match(get(key), {
          //     onSome: (node) => (node.id === EXAMPLE_ID ? get(sub) : undefined),
          //     onNone: () => undefined,
          //   }),
          // connector: (_, sub) => [{ id: exampleId(2), type: EXAMPLE_TYPE, data: sub }],
          connector: ({ get, node }) =>
            pipe(
              node.id === EXAMPLE_ID ? Option.some(get(sub)) : Option.none(),
              Option.map((sub) => [{ id: exampleId(2), type: EXAMPLE_TYPE, data: sub }]),
              Option.getOrElse(() => []),
            ),
        }),
        createExtension({
          id: 'connector2',
          // map: (get, key) =>
          //   Option.match(get(key), {
          //     onSome: (node) => (node.id === EXAMPLE_ID ? node : undefined),
          //     onNone: () => undefined,
          //   }),
          // connector: (_, node) => [{ id: exampleId(3), type: EXAMPLE_TYPE, data: node.data }],
          connector: ({ get, node }) =>
            pipe(
              node.id === EXAMPLE_ID ? Option.some(node.data) : Option.none(),
              Option.map((data) => [{ id: exampleId(3), type: EXAMPLE_TYPE, data }]),
              Option.getOrElse(() => []),
            ),
        }),
      ]);

      const graph = builder.graph;

      let parentCount = 0;
      const parentCancel = registry.subscribe(graph.node(EXAMPLE_ID), (_) => {
        // console.log('parent', _);
        parentCount++;
      });
      onTestFinished(() => parentCancel());

      let independentCount = 0;
      const independentCancel = registry.subscribe(graph.node(exampleId(2)), (_) => {
        // console.log('independent', _);
        independentCount++;
      });
      onTestFinished(() => independentCancel());

      let dependentCount = 0;
      const dependentCancel = registry.subscribe(graph.node(exampleId(3)), (_) => {
        // console.log('dependent', _);
        dependentCount++;
      });
      onTestFinished(() => dependentCancel());

      console.log('start');

      // Counts should not increment until the node is expanded.
      graph.expand(ROOT_ID);
      expect(parentCount).to.equal(1);
      expect(independentCount).to.equal(0);
      expect(dependentCount).to.equal(0);

      console.log('expanded');

      // Counts should increment when the node is expanded.
      graph.expand(EXAMPLE_ID);
      expect(parentCount).to.equal(1);
      expect(independentCount).to.equal(1);
      expect(dependentCount).to.equal(1);

      console.log('update name');

      // Only dependent count should increment when the parent changes.
      registry.set(name, 'updated');
      expect(parentCount).to.equal(2);
      expect(independentCount).to.equal(1);
      expect(dependentCount).to.equal(2);

      console.log('update sub');

      // Only independent count should increment when state changes.
      registry.set(sub, '???');
      expect(parentCount).to.equal(2);
      expect(independentCount).to.equal(2);
      expect(dependentCount).to.equal(2);

      // console.log('batch');

      // // Counts should not increment because the node is removed.
      // Rx.batch(() => {
      //   registry.set(name, 'removed');
      //   registry.set(sub, 'batch');
      // });
      // expect(parentCount).to.equal(2);
      // expect(independentCount).to.equal(2);
      // expect(dependentCount).to.equal(2);

      console.log('update sub!');

      // Independent count should increment.
      registry.set(sub, '!!!');
      expect(parentCount).to.equal(2);
      expect(independentCount).to.equal(3);
      expect(dependentCount).to.equal(2);

      // console.log('added');

      // // Dependent count should increment when the node is added back.
      // registry.set(name, 'added');
      // expect(independentCount).to.equal(2);
      // expect(dependentCount).to.equal(3);

      // // Counts should not increment when the node is expanded again.
      // graph.expand(EXAMPLE_ID);
      // expect(independentCount).to.equal(2);
      // expect(dependentCount).to.equal(3);
    });

    test.skip('updates are constrained failing 2', () => {
      const registry = Registry.make();
      const builder = new GraphBuilder({ registry });
      const name = Rx.make('default');
      const sub = Rx.make('default');

      builder.addExtension([
        createExtension({
          id: 'root',
          connector: ({ get, node }) => {
            console.log('!!root', getDebugName(node), node.id);
            return pipe(
              node.id === 'root' ? Option.some(get(name)) : Option.none(),
              Option.filter((name) => name !== 'removed'),
              Option.map((name) => [{ id: EXAMPLE_ID, type: EXAMPLE_TYPE, data: name }]),
              Option.getOrElse(() => []),
            );
          },
        }),
        createExtension({
          id: 'connector1',
          connector: ({ get, node }) => {
            const result = pipe(
              node.id === EXAMPLE_ID ? Option.some(get(sub)) : Option.none(),
              Option.map((sub) => [{ id: exampleId(2), type: EXAMPLE_TYPE, data: sub }]),
              Option.getOrElse(() => []),
            );
            console.log('!!connector1', getDebugName(node), node.id, getDebugName(result));
            return result;
          },
        }),
        createExtension({
          id: 'connector2',
          connector: ({ get, node }) => {
            const result = pipe(
              node.id === EXAMPLE_ID ? Option.some(node.data) : Option.none(),
              Option.map((data) => {
                console.log('??connector2', data);
                return [{ id: exampleId(3), type: EXAMPLE_TYPE, data }];
              }),
              Option.getOrElse(() => []),
            );
            console.log('!!connector2', getDebugName(node), node.id, getDebugName(result));
            return result;
          },
        }),
      ]);

      const graph = builder.graph;

      let parentCount = 0;
      const parentCancel = registry.subscribe(graph.node(EXAMPLE_ID), (_) => {
        // console.log('parent', _);
        parentCount++;
      });
      onTestFinished(() => parentCancel());

      let independentCount = 0;
      const independentCancel = registry.subscribe(graph.node(exampleId(2)), (_) => {
        // console.log('independent', _);
        independentCount++;
      });
      onTestFinished(() => independentCancel());

      let dependentCount = 0;
      const dependentCancel = registry.subscribe(graph.node(exampleId(3)), (_) => {
        // console.log('dependent', _);
        dependentCount++;
      });
      onTestFinished(() => dependentCancel());

      console.log('\nstart\n');

      graph.expand(ROOT_ID);
      graph.expand(EXAMPLE_ID);
      expect(parentCount).to.equal(1);
      expect(independentCount).to.equal(1);
      expect(dependentCount).to.equal(1);

      console.log('\nsub one\n');

      registry.set(sub, 'one');
      expect(parentCount).to.equal(1);
      expect(independentCount).to.equal(2);
      expect(dependentCount).to.equal(1);

      console.log('\nname one\n');

      registry.set(name, 'one');
      expect(parentCount).to.equal(2);
      expect(independentCount).to.equal(2);
      expect(dependentCount).to.equal(2);

      console.log('\nsub two\n');

      registry.set(sub, 'two');
      expect(parentCount).to.equal(2);
      expect(independentCount).to.equal(3);
      expect(dependentCount).to.equal(2);

      console.log('\nname two\n');

      // TODO(wittjosiah): Issues seems to be that the `connections` rx value is not being re-evaluated when the name changes at this point for some reason.
      registry.set(name, 'two');
      expect(parentCount).to.equal(3);
      expect(independentCount).to.equal(3);
      expect(dependentCount).to.equal(3); // current: 2

      console.log('\nsub three\n');

      registry.set(sub, 'three');
      expect(parentCount).to.equal(3);
      expect(independentCount).to.equal(4); // current: 3
      expect(dependentCount).to.equal(3); // current: 2
    });
  });

  describe('echo', () => {
    let dbBuilder: EchoTestBuilder;

    beforeEach(async () => {
      dbBuilder = await new EchoTestBuilder().open();
    });

    afterEach(async () => {
      await dbBuilder.close();
    });

    test('rx references are loaded lazily and receive signal notifications', async () => {
      const registry = Registry.make();
      await using peer = await dbBuilder.createPeer();

      let outerId: string;
      {
        await using db = await peer.createDatabase();
        const inner = db.add({ name: 'inner' });
        const outer = db.add({ inner: Ref.make(inner) });
        outerId = outer.id;
        await db.flush();
      }

      await peer.reload();
      {
        await using db = await peer.openLastDatabase();
        const outer = (await db.query({ id: outerId }).first()) as any;
        const innerRx = rxFromRef(outer.inner);

        const loaded = new Trigger();
        let count = 0;
        const cancel = registry.subscribe(innerRx, (inner) => {
          count++;
          if (inner) {
            loaded.wake();
          }
        });
        onTestFinished(() => cancel());

        expect(registry.get(innerRx)).to.eq(undefined);
        expect(count).to.eq(1);

        await loaded.wait();
        expect(registry.get(innerRx)).to.include({ name: 'inner' });
        expect(count).to.eq(2);
      }
    });

    test('references graph builder', async () => {
      const registry = Registry.make();
      await using peer = await dbBuilder.createPeer();

      let outerId, innerId: string;
      {
        await using db = await peer.createDatabase();
        const inner = db.add({ name: 'inner' });
        const outer = db.add({ inner: Ref.make(inner) });
        innerId = inner.id;
        outerId = outer.id;
        await db.flush();
      }

      await peer.reload();

      {
        await using db = await peer.openLastDatabase();
        const outer = (await db.query({ id: outerId }).first()) as any;
        const innerRx = rxFromRef(outer.inner);
        const inner = registry.get(innerRx);
        expect(inner).to.eq(undefined);

        const builder = new GraphBuilder({ registry });
        builder.addExtension(
          createExtension({
            id: 'outbound-connector',
            connector: ({ get }) => {
              const inner = get(innerRx) as any;
              return inner ? [{ id: inner.id, type: EXAMPLE_TYPE, data: inner.name }] : [];
            },
          }),
        );

        const graph = builder.graph;

        const loaded = new Trigger();
        let count = 0;
        const cancel = registry.subscribe(graph.connections(ROOT_ID), (nodes) => {
          count++;
          if (nodes.length > 0) {
            loaded.wake();
          }
        });
        onTestFinished(() => cancel());
        registry.get(graph.connections(ROOT_ID));
        expect(count).to.eq(1);

        graph.expand(ROOT_ID);
        await loaded.wait();
        expect(count).to.eq(2);

        const nodes = registry.get(graph.connections(ROOT_ID));
        expect(nodes).has.length(1);
        expect(nodes[0].id).to.eq(innerId);
        expect(nodes[0].data).to.eq('inner');
      }
    });
  });
});
