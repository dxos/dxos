//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Filter, Obj, Query, Type } from '@dxos/echo';
import { type EchoClient, type EchoDatabase } from '@dxos/echo-client';
import { EchoTestBuilder, type EchoTestPeer } from '@dxos/echo-client/testing';
import { TestSchema } from '@dxos/echo/testing';
import { type EntityMeta } from '@dxos/index-core';
import { DXN } from '@dxos/keys';

/**
 * End-to-end coverage of registry indexing: the client mirrors its in-process registry to the host
 * (`RegistryPublisher` → `QueryService.updateRegistry` → `RegistryDataSource`), the indexer writes
 * those entities into the same `objectMeta`/FTS tables as everything else, and the `registryKey`
 * mark keeps them out of every space-scoped read.
 */

class Widget extends Type.makeObject<Widget>(DXN.make('com.example.type.widget', '0.1.0'))(
  Schema.Struct({ label: Schema.String, size: Schema.optional(Schema.Number) }),
) {}

/** A keyed (non-type) registry entity — the shape operations and skills use. */
const makeKeyed = (key: string, version: string | undefined, props: { label: string; size?: number }) =>
  Obj.make(TestSchema.Expando, { [Obj.Meta]: { key, version }, ...props });

const KEY = 'com.example.op.resize';

describe('registry indexing', () => {
  let builder: EchoTestBuilder;
  let peer: EchoTestPeer;
  let client: EchoClient;
  let db: EchoDatabase;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
    ({ peer, db } = await builder.createDatabase());
    client = peer.client;
  });

  afterEach(async () => {
    await builder.close();
  });

  /** Publishes the registry and resolves once the host has indexed it. */
  const publish = () => client.flushRegistry();

  const rowsFor = (keys: readonly string[]) => peer.host.queryIndexedRegistry({ keys });

  /** Pushes entries straight at the host, bypassing the client's own keying and serialization. */
  const pushRaw = (entries: readonly { key: string; objectJson: string }[]) =>
    peer.host.updateRegistry('test-client', entries);

  const only = async (keys: readonly string[]): Promise<EntityMeta> => {
    const rows = await rowsFor(keys);
    expect(rows).toHaveLength(1);
    return rows[0];
  };

  /** The indexed snapshot behind a row, for asserting which registration is the active one. */
  const labelOf = async (row: EntityMeta): Promise<string | undefined> => {
    const snapshots = await peer.runtime.runPromise(peer.host.indexEngine.querySnapshotsJSON([row.recordId]));
    return (snapshots[0]?.snapshot as { label?: string } | undefined)?.label;
  };

  describe('publication', () => {
    test('a registered entity is indexed under its versioned key', async () => {
      client.graph.registry.add([makeKeyed(KEY, '1.0.0', { label: 'a' })]);
      await publish();

      const row = await only([`dxn:${KEY}:1.0.0`]);
      expect(row.registryKey).toBe(`dxn:${KEY}:1.0.0`);
      expect(row.contentHash).toBeTruthy();
      expect(row.entityKind).toBe('object');
      // Registry rows carry no space or document of their own.
      expect(row.documentId).toBe('');
      expect(row.queueId).toBe('');
    });

    test('an entity with no meta key is indexed under its identifier EID', async () => {
      const object = Obj.make(TestSchema.Expando, { label: 'anonymous' });
      client.graph.registry.add([object]);
      await publish();

      const row = await only([`echo:///${object.id}`]);
      expect(row.objectId).toBe(object.id);
    });

    test('a type entity is indexed under its typename DXN', async () => {
      client.graph.registry.add([Widget]);
      await publish();

      const row = await only(['dxn:com.example.type.widget:0.1.0']);
      expect(row.objectId).toBe(Widget.id);
    });

    test('the snapshot lands in the FTS table alongside the metadata row', async () => {
      client.graph.registry.add([makeKeyed(KEY, '1.0.0', { label: 'searchable' })]);
      await publish();

      const row = await only([`dxn:${KEY}:1.0.0`]);
      expect(await labelOf(row)).toBe('searchable');
    });
  });

  describe('deduplication', () => {
    test('re-registering an identical entity does not rewrite the row', async () => {
      const object = makeKeyed(KEY, '1.0.0', { label: 'a' });
      client.graph.registry.add([object]);
      await publish();
      const before = await only([`dxn:${KEY}:1.0.0`]);

      // Same key, byte-identical snapshot: the digest matches, so nothing re-enters the indexer.
      client.graph.registry.add([object]);
      await publish();
      const after = await only([`dxn:${KEY}:1.0.0`]);

      expect(after.recordId).toBe(before.recordId);
      expect(after.version).toBe(before.version);
      expect(after.contentHash).toBe(before.contentHash);
    });

    test('re-registering a changed entity under the same key replaces the row in place', async () => {
      client.graph.registry.add([makeKeyed(KEY, '1.0.0', { label: 'first' })]);
      await publish();
      const before = await only([`dxn:${KEY}:1.0.0`]);

      const replacement = makeKeyed(KEY, '1.0.0', { label: 'second' });
      client.graph.registry.add([replacement]);
      await publish();
      const after = await only([`dxn:${KEY}:1.0.0`]);

      // One key, one row — even though the replacement is a different object.
      expect(after.recordId).toBe(before.recordId);
      expect(after.objectId).toBe(replacement.id);
      expect(after.contentHash).not.toBe(before.contentHash);
      expect(after.version).toBeGreaterThan(before.version);
    });

    test('an unchanged registry survives a restart without being re-indexed', async () => {
      // A code-shipped entity is the same object on both sides of a restart — a type declared at
      // module scope, here stood in for by one instance registered twice.
      const durable = makeKeyed(KEY, '1.0.0', { label: 'durable' });
      client.graph.registry.add([durable]);
      await publish();
      const before = await only([`dxn:${KEY}:1.0.0`]);

      // The buffered sequence and its cursor are session-scoped, so the whole registry is offered
      // again after a reload; the persisted digest is what keeps it from being rewritten.
      await peer.reload();
      client = peer.client;
      client.graph.registry.add([durable]);
      await publish();

      const after = await only([`dxn:${KEY}:1.0.0`]);
      expect(after.recordId).toBe(before.recordId);
      expect(after.version).toBe(before.version);
      expect(after.contentHash).toBe(before.contentHash);
    });

    test('a registry larger than one index batch survives a restart intact', async () => {
      // More entries than the indexer's per-pass limit, so the skip walk has to advance its cursor
      // past entries it emits nothing for; stopping at the limit would strand the tail.
      const many = Array.from({ length: 120 }, (_, index) =>
        makeKeyed(`com.example.op.bulk${index}`, '1.0.0', { label: `entry ${index}` }),
      );
      const keys = many.map((_, index) => `dxn:com.example.op.bulk${index}:1.0.0`);
      client.graph.registry.add(many);
      await publish();
      const before = await rowsFor(keys);
      expect(before).toHaveLength(120);

      await peer.reload();
      client = peer.client;
      client.graph.registry.add(many);
      await publish();

      const after = await rowsFor(keys);
      expect(after).toHaveLength(120);
      // Nothing was rewritten: every row kept the sequence it was first indexed with.
      expect(after.map((row) => row.version).sort()).toEqual(before.map((row) => row.version).sort());
    });
  });

  describe('versions', () => {
    test('two versions of one key are two entries', async () => {
      client.graph.registry.add([makeKeyed(KEY, '1.0.0', { label: 'v1' })]);
      await publish();
      client.graph.registry.add([makeKeyed(KEY, '2.0.0', { label: 'v2' })]);
      await publish();

      const rows = await rowsFor([`dxn:${KEY}:1.0.0`, `dxn:${KEY}:2.0.0`]);
      expect(rows).toHaveLength(2);
      expect(new Set(rows.map((row) => row.registryKey))).toEqual(new Set([`dxn:${KEY}:1.0.0`, `dxn:${KEY}:2.0.0`]));
    });

    test('an unversioned key matches every version, newest registration first', async () => {
      client.graph.registry.add([makeKeyed(KEY, '1.0.0', { label: 'v1' })]);
      await publish();
      client.graph.registry.add([makeKeyed(KEY, '2.0.0', { label: 'v2' })]);
      await publish();

      const rows = await rowsFor([`dxn:${KEY}`]);
      expect(rows.map((row) => row.registryKey)).toEqual([`dxn:${KEY}:2.0.0`, `dxn:${KEY}:1.0.0`]);
    });

    test('the object registered last is primary, even when it is the older version', async () => {
      client.graph.registry.add([makeKeyed(KEY, '2.0.0', { label: 'v2' })]);
      await publish();
      client.graph.registry.add([makeKeyed(KEY, '1.0.0', { label: 'v1' })]);
      await publish();

      const rows = await rowsFor([`dxn:${KEY}`]);
      // Primacy follows registration order, not version order.
      expect(rows[0].registryKey).toBe(`dxn:${KEY}:1.0.0`);

      // Re-registering the newer version with a change puts it back in front.
      client.graph.registry.add([makeKeyed(KEY, '2.0.0', { label: 'v2 revised' })]);
      await publish();
      const reordered = await rowsFor([`dxn:${KEY}`]);
      expect(reordered[0].registryKey).toBe(`dxn:${KEY}:2.0.0`);
    });

    test('a versioned key matches only its own version', async () => {
      client.graph.registry.add([makeKeyed(KEY, '1.0.0', { label: 'v1' }), makeKeyed(KEY, '2.0.0', { label: 'v2' })]);
      await publish();

      const rows = await rowsFor([`dxn:${KEY}:1.0.0`]);
      expect(rows.map((row) => row.registryKey)).toEqual([`dxn:${KEY}:1.0.0`]);
    });
  });

  describe('removal', () => {
    test('unregistering an entity reclaims its row', async () => {
      const object = makeKeyed(KEY, '1.0.0', { label: 'transient' });
      client.graph.registry.add([object]);
      await publish();
      expect(await rowsFor([`dxn:${KEY}:1.0.0`])).toHaveLength(1);

      client.graph.registry.remove(object.id);
      await publish();
      expect(await rowsFor([`dxn:${KEY}:1.0.0`])).toHaveLength(0);
    });

    test('one client leaving does not reclaim an entry another client still holds', async () => {
      const second = await peer.createClient();
      const shared = makeKeyed(KEY, '1.0.0', { label: 'shared' });
      client.graph.registry.add([shared]);
      second.graph.registry.add([shared]);
      await publish();
      await second.flushRegistry();
      expect(await rowsFor([`dxn:${KEY}:1.0.0`])).toHaveLength(1);

      // The host holds the union of its clients' registries, so one client dropping the entity is
      // not the entity leaving.
      client.graph.registry.remove(shared.id);
      await publish();
      expect(await rowsFor([`dxn:${KEY}:1.0.0`])).toHaveLength(1);

      second.graph.registry.remove(shared.id);
      await second.flushRegistry();
      expect(await rowsFor([`dxn:${KEY}:1.0.0`])).toHaveLength(0);
    });

    test('a client that closes stops counting as an owner', async () => {
      const second = await peer.createClient();
      const shared = makeKeyed(KEY, '1.0.0', { label: 'shared' });
      client.graph.registry.add([shared]);
      second.graph.registry.add([shared]);
      await publish();
      await second.flushRegistry();

      // Closing withdraws the claim but keeps the rows — they are a cache the next session
      // re-adopts, so a clean shutdown must not re-index the whole registry at the next boot.
      await second.close();
      expect(await rowsFor([`dxn:${KEY}:1.0.0`])).toHaveLength(1);

      // With the closed client no longer an owner, the remaining client's unregister is the last
      // one and reclaims the row; a phantom owner would have kept it indexed.
      client.graph.registry.remove(shared.id);
      await publish();
      expect(await rowsFor([`dxn:${KEY}:1.0.0`])).toHaveLength(0);
    });

    test("a shared key keeps the surviving client's own value when the last registrant leaves", async () => {
      const second = await peer.createClient();
      client.graph.registry.add([makeKeyed(KEY, '1.0.0', { label: 'from first' })]);
      await publish();
      second.graph.registry.add([makeKeyed(KEY, '1.0.0', { label: 'from second' })]);
      await second.flushRegistry();
      // Assert the precondition: without it the test would also pass if last-registration
      // selection never took effect and the first client's value had stayed active throughout.
      expect(await labelOf(await only([`dxn:${KEY}:1.0.0`]))).toBe('from second');

      // The second client registered last, so its value is the indexed one; when it leaves, the
      // first client's value has to come back rather than the second's staying behind.
      await second.close();
      await publish();
      expect(await labelOf(await only([`dxn:${KEY}:1.0.0`]))).toBe('from first');
    });

    test('a row a previous session left behind is reclaimed on the next push', async () => {
      client.graph.registry.add([makeKeyed(KEY, '1.0.0', { label: 'stale' })]);
      await publish();
      expect(await rowsFor([`dxn:${KEY}:1.0.0`])).toHaveLength(1);

      // The restarted client never registers the entity, so the first snapshot of the new session
      // is what tells the host it is gone.
      await peer.reload();
      client = peer.client;
      await publish();
      expect(await rowsFor([`dxn:${KEY}:1.0.0`])).toHaveLength(0);
    });
  });

  describe('validation', () => {
    test('an entry with an empty key cannot reach the index', async () => {
      db.add(Obj.make(TestSchema.Expando, { label: 'in space' }));
      await db.flush();
      const before = await db.query(Query.select(Filter.everything())).run();
      expect(before).toHaveLength(1);

      // The empty string is what marks an ordinary row, so a push carrying it — and the removal
      // that would follow — must not be able to address the whole non-registry index.
      await pushRaw([{ key: '', objectJson: JSON.stringify({ id: '01M320W59PG8EVVGGQKVX90G6D' }) }]);
      await pushRaw([]);

      expect(await db.query(Query.select(Filter.everything())).run()).toHaveLength(1);
    });

    test('a malformed replacement does not preserve the previous registration', async () => {
      const key = 'dxn:com.example.op.replaced:1.0.0';
      const good = (label: string) =>
        JSON.stringify(Obj.toJSON(makeKeyed('com.example.op.replaced', '1.0.0', { label })));
      await pushRaw([{ key, objectJson: good('original') }]);
      expect(await rowsFor([key])).toHaveLength(1);

      // The client no longer carries a usable entry for this key, so the reconciliation must treat
      // it as gone rather than let the malformed push hold the previous contribution in place.
      await pushRaw([{ key, objectJson: 'not json at all' }]);
      expect(await rowsFor([key])).toHaveLength(0);
    });

    test('a malformed entity is dropped without failing the snapshot', async () => {
      await pushRaw([
        { key: 'dxn:com.example.op.bad:1.0.0', objectJson: '[1,2,3]' },
        {
          key: 'dxn:com.example.op.good:1.0.0',
          objectJson: JSON.stringify(Obj.toJSON(makeKeyed('com.example.op.good', '1.0.0', { label: 'ok' }))),
        },
      ]);

      expect(await rowsFor(['dxn:com.example.op.bad:1.0.0'])).toHaveLength(0);
      expect(await rowsFor(['dxn:com.example.op.good:1.0.0'])).toHaveLength(1);
    });
  });

  describe('isolation from space queries', () => {
    test('a registry entity is not returned by a space query', async () => {
      client.graph.registry.add([makeKeyed(KEY, '1.0.0', { label: 'registry only' })]);
      await publish();
      db.add(Obj.make(TestSchema.Expando, { label: 'in space' }));
      await db.flush();

      const results = await db.query(Query.select(Filter.everything())).run();
      expect(results.map((object) => (object as { label?: string }).label)).toEqual(['in space']);
    });

    test('a registry entity is not returned by a full-text search over a space', async () => {
      client.graph.registry.add([makeKeyed(KEY, '1.0.0', { label: 'zyzzyva' })]);
      await publish();
      db.add(Obj.make(TestSchema.Expando, { label: 'zyzzyva' }));
      await db.flush();

      const results = await db.query(Query.select(Filter.text('zyzzyva'))).run();
      expect(results).toHaveLength(1);
      expect((results[0] as { id: string }).id).not.toBe(KEY);
    });

    test('a registry type entity is not returned by a space-scoped type query', async () => {
      client.graph.registry.add([Widget]);
      await publish();
      await db.addType(TestSchema.Task);
      await db.flush();

      const results = await db.query(Query.select(Filter.type(Type.Type))).run();
      const typenames = results.map((type) => Type.getTypename(type as Type.AnyEntity));
      expect(typenames).toContain(Type.getTypename(TestSchema.Task));
      expect(typenames).not.toContain('com.example.type.widget');
    });

    test('a space object and a registry entity sharing a type stay separable', async () => {
      client.graph.registry.add([makeKeyed(KEY, '1.0.0', { label: 'registry' })]);
      await publish();
      db.add(Obj.make(TestSchema.Expando, { label: 'space' }));
      await db.flush();

      const inSpace = await db.query(Query.select(Filter.type(TestSchema.Expando))).run();
      expect(inSpace.map((object) => (object as { label?: string }).label)).toEqual(['space']);

      const inRegistry = await rowsFor([`dxn:${KEY}`]);
      expect(inRegistry).toHaveLength(1);
    });
  });
});
