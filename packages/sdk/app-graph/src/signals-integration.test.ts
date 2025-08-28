//
// Copyright 2025 DXOS.org
//

import { Registry, Rx } from '@effect-rx/rx-react';
import { signal } from '@preact/signals-core';
import { afterEach, beforeEach, describe, expect, onTestFinished, test } from 'vitest';

import { Trigger } from '@dxos/async';
import { Filter } from '@dxos/echo-db';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { Expando, Ref } from '@dxos/echo/internal';
import { registerSignalsRuntime } from '@dxos/echo-signals';
import { live } from '@dxos/live-object';

import { ROOT_ID } from './graph';
import { GraphBuilder, createExtension, rxFromSignal } from './graph-builder';
import { rxFromQuery } from './testing';

registerSignalsRuntime();

const EXAMPLE_TYPE = 'dxos.org/type/example';

describe('signals integration', () => {
  test('creating rx from signal', () => {
    const registry = Registry.make();
    const state = signal<number>(0);
    const value = rxFromSignal(() => state.value);
    const inline = Rx.make((get) => {
      // NOTE: This will create a new rx instance each time.
      // This test is verifying that this behaves the same as using a stable rx instance.
      // The parent will remain subscribed to one instance until the new one is created.
      // The old one will then be garbage collected because it is no longer referenced.
      const rx = rxFromSignal(() => get(value));
      return get(rx);
    });

    let count = 0;
    const cancel = registry.subscribe(value, (value) => {
      count = value;
    });
    onTestFinished(() => cancel());

    let inlineCount = 0;
    const inlineCancel = registry.subscribe(inline, (value) => {
      inlineCount = value;
    });
    onTestFinished(() => inlineCancel());

    registry.get(value);
    registry.get(inline);
    expect(count).to.eq(0);
    expect(inlineCount).to.eq(0);

    state.value = 1;
    expect(count).to.eq(1);
    expect(inlineCount).to.eq(1);

    state.value = 2;
    expect(count).to.eq(2);
    expect(inlineCount).to.eq(2);
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
        const outer = (await db.query(Filter.ids(outerId)).first()) as any;
        const innerRx = rxFromSignal(() => outer.inner.target);

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
        const outer = (await db.query(Filter.ids(outerId)).first()) as any;
        const innerRx = rxFromSignal(() => outer.inner.target);
        const inner = registry.get(innerRx);
        expect(inner).to.eq(undefined);

        const builder = new GraphBuilder({ registry });
        builder.addExtension(
          createExtension({
            id: 'outbound-connector',
            connector: () =>
              Rx.make((get) => {
                const inner = get(innerRx) as any;
                return inner ? [{ id: inner.id, type: EXAMPLE_TYPE, data: inner.name }] : [];
              }),
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

    test('query graph builder', async () => {
      const registry = Registry.make();
      await using peer = await dbBuilder.createPeer();
      await using db = await peer.createDatabase();
      db.add(live(Expando, { name: 'a' }));
      db.add(live(Expando, { name: 'b' }));

      const builder = new GraphBuilder({ registry });
      builder.addExtension(
        createExtension({
          id: 'expando',
          connector: () => {
            const query = db.query(Filter.type(Expando));

            return Rx.make((get) => {
              const objects = get(rxFromQuery(query));
              return objects.map((object) => ({ id: object.id, type: EXAMPLE_TYPE, data: object.name }));
            });
          },
        }),
      );

      const graph = builder.graph;
      let count = 0;
      const cancel = registry.subscribe(graph.connections(ROOT_ID), (nodes) => {
        count = nodes.length;
      });
      onTestFinished(() => cancel());

      registry.get(graph.connections(ROOT_ID));
      expect(count).to.eq(0);

      graph.expand(ROOT_ID);
      expect(count).to.eq(2);

      const object = db.add(live(Expando, { name: 'c' }));
      await db.flush();
      expect(count).to.eq(3);

      // NOTE: This graph builder is not reactive to the object update.
      object.name = 'updated';
      await db.flush();
      expect(count).to.eq(3);
    });
  });
});
