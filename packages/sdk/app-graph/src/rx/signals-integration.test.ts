//
// Copyright 2025 DXOS.org
//

import { Registry, Rx } from '@effect-rx/rx-react';
import { afterEach, beforeEach, describe, expect, onTestFinished, test } from 'vitest';

import { Trigger } from '@dxos/async';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { Ref } from '@dxos/echo-schema';
import { registerSignalsRuntime } from '@dxos/echo-signals';

import { ROOT_ID } from './graph';
import { createExtension, GraphBuilder, rxFromRef } from './graph-builder';

registerSignalsRuntime();

const EXAMPLE_TYPE = 'dxos.org/type/example';

describe('signals integration', () => {
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
  });
});
