//
// Copyright 2025 DXOS.org
//

import { Atom, Registry } from '@effect-atom/atom-react';
import { signal } from '@preact/signals-core';
import { afterEach, beforeEach, describe, expect, onTestFinished, test } from 'vitest';

import { Trigger } from '@dxos/async';
import { Obj, Type } from '@dxos/echo';
import { Ref } from '@dxos/echo/internal';
import { Filter } from '@dxos/echo-db';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { registerSignalsRuntime } from '@dxos/echo-signals';

import { ROOT_ID } from './graph';
import { GraphBuilder, make, atomFromSignal, createExtension } from './graph-builder';
import { atomFromQuery } from './testing';

registerSignalsRuntime();

const EXAMPLE_TYPE = 'dxos.org/type/example';

describe('signals integration', () => {
  test('creating atom from signal', () => {
    const registry = Registry.make();
    const state = signal<number>(0);
    const value = atomFromSignal(() => state.value);
    const inline = Atom.make((get) => {
      // NOTE: This will create a new atom instance each time.
      // This test is verifying that this behaves the same as using a stable atom instance.
      // The parent will remain subscribed to one instance until the new one is created.
      // The old one will then be garbage collected because it is no longer referenced.
      const atom = atomFromSignal(() => get(value));
      return get(atom);
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

    test('atom references are loaded lazily and receive signal notifications', async () => {
      const registry = Registry.make();
      await using peer = await dbBuilder.createPeer();

      let outerId: string;
      {
        await using db = await peer.createDatabase();
        const inner = db.add(Obj.make(Type.Expando, { name: 'inner' }));
        const outer = db.add(Obj.make(Type.Expando, { inner: Ref.make(inner) }));
        outerId = outer.id;
        await db.flush();
      }

      await peer.reload();
      {
        await using db = await peer.openLastDatabase();
        const outer = (await db.query(Filter.id(outerId)).first()) as any;
        const innerAtom = atomFromSignal(() => outer.inner.target);
        const loaded = new Trigger();

        let count = 0;
        const cancel = registry.subscribe(innerAtom, (inner) => {
          count++;
          if (inner) {
            loaded.wake();
          }
        });

        onTestFinished(() => cancel());

        expect(registry.get(innerAtom)).to.eq(undefined);
        expect(count).to.eq(1);

        await loaded.wait();
        expect(registry.get(innerAtom)).to.include({ name: 'inner' });
        expect(count).to.eq(2);
      }
    });

    test('references graph builder', async () => {
      const registry = Registry.make();
      await using peer = await dbBuilder.createPeer();

      let outerId, innerId: string;
      {
        await using db = await peer.createDatabase();
        const inner = db.add(Obj.make(Type.Expando, { name: 'inner' }));
        const outer = db.add(Obj.make(Type.Expando, { inner: Ref.make(inner) }));
        innerId = inner.id;
        outerId = outer.id;
        await db.flush();
      }

      await peer.reload();

      {
        await using db = await peer.openLastDatabase();
        const outer = (await db.query(Filter.id(outerId)).first()) as any;
        const innerAtom = atomFromSignal(() => outer.inner.target);
        const inner = registry.get(innerAtom);
        expect(inner).to.eq(undefined);

        const builder = make({ registry });
        builder.addExtension(
          createExtension({
            id: 'outbound-connector',
            connector: () =>
              Atom.make((get) => {
                const inner = get(innerAtom) as any;
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
      db.add(Obj.make(Type.Expando, { name: 'a' }));
      db.add(Obj.make(Type.Expando, { name: 'b' }));

      const builder = new GraphBuilder({ registry });
      builder.addExtension(
        createExtension({
          id: 'expando',
          connector: () => {
            const query = db.query(Filter.type(Type.Expando));

            return Atom.make((get) => {
              const objects = get(atomFromQuery(query));
              return objects.map((object) => ({
                id: object.id,
                type: EXAMPLE_TYPE,
                data: object.name,
              }));
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

      const object = db.add(Obj.make(Type.Expando, { name: 'c' }));
      await db.flush();
      expect(count).to.eq(3);

      // NOTE: This graph builder is not reactive to the object update.
      object.name = 'updated';
      await db.flush();
      expect(count).to.eq(3);
    });
  });
});
