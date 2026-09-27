//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { DXN, Filter, Obj, Type } from '@dxos/echo';
import { EchoTestBuilder, getObjectCore } from '@dxos/echo-client/testing';
import { type TestReplicationNetwork } from '@dxos/echo-host/testing';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';

import { type PartitionedPair, type TestDatabase, createPartitionedPair } from './migration-bench/harness.ts';

//
// Minimal repro for the echo-handler array proxy staleness found by
// `migration-bench/array-fan-out.test.ts` A2b: a remote reorder (delete + reinsert, since Automerge
// has no list move) that lands on an array index whose element proxy is cached must invalidate that
// proxy's OWN fields, not just swap which raw node the index points at.
//

/** Schema field deliberately named `id`, like `PROPERTY_ID` (`@dxos/echo-protocol`'s root-object id
 * key) -- the collision under test. */
const ElementStruct = Schema.Struct({
  id: Schema.optional(Schema.String),
  name: Schema.String,
});

class ArrayParentDoc extends Type.makeObject<ArrayParentDoc>(
  DXN.make('org.dxos.test.array-reorder-proxy.ArrayParentDoc', '0.1.0'),
)(
  Schema.Struct({
    items: Schema.optional(Schema.Array(ElementStruct)),
  }),
) {}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

/** Ground truth: `objects.<id>.data.items`, read straight off the raw automerge doc -- bypasses every
 * proxy target/cache the handler maintains. */
const getRawItems = (doc: unknown, objectId: string): Record<string, unknown>[] => {
  invariant(isRecord(doc), 'expected an automerge doc');
  const objects = doc.objects;
  invariant(isRecord(objects), 'expected doc.objects');
  const entity = objects[objectId];
  invariant(isRecord(entity), 'expected an entity structure');
  const data = entity.data;
  invariant(isRecord(data), 'expected entity.data');
  const items = data.items;
  invariant(Array.isArray(items), 'expected entity.data.items to be an array');
  return items.map((item) => {
    invariant(isRecord(item), 'expected an array element structure');
    return item;
  });
};

/** Narrows away `undefined` while preserving whatever array type the caller passed -- a fixed
 * `ArrayParentDoc`-typed helper would collapse a mutable `Obj.update` draft's array back to the
 * read-only type declared on the schema, losing `splice`/`push`/property assignment. */
const defined = <T>(value: T | undefined, message: string): T => {
  invariant(value !== undefined, message);
  return value;
};

const findByName = (parent: ArrayParentDoc, name: string) => {
  const item = defined(parent.items, 'expected items to be present').find((item) => item.name === name);
  invariant(item, `expected an element named ${name}`);
  return item;
};

describe('array reorder proxy invalidation', () => {
  test('a remote reorder concurrent with a field write leaves the live proxy agreeing with the raw doc', async ({
    expect,
  }) => {
    const builder = await new EchoTestBuilder().open();
    let network: TestReplicationNetwork | undefined;
    try {
      const pair: PartitionedPair = await createPartitionedPair(builder, [ArrayParentDoc]);
      network = pair.network;
      const { partition, heal, syncAll } = pair;

      const [spaceKey] = PublicKey.randomSequence();
      const db1: TestDatabase = await pair.peer1.createDatabase(spaceKey);
      const parent1 = db1.add(
        Obj.make(ArrayParentDoc, { items: [{ name: 'alpha' }, { name: 'beta' }, { name: 'gamma' }] }),
      );
      await db1.flush();

      const rootUrl = db1.rootUrl;
      invariant(rootUrl, 'root url');
      const db2: TestDatabase = await pair.peer2.openDatabase(spaceKey, rootUrl);
      await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
      await db2.updateIndexes();
      const [parent2] = await db2.query(Filter.type(ArrayParentDoc)).run();
      invariant(parent2, 'expected the replicated parent');

      await partition();

      // Peer 1 writes a field onto every element -- including `gamma`, mounted at index 2 -- and
      // holds `parent1` live across the whole scenario (the long-lived reference the bug depends on).
      Obj.update(parent1, (parent1) => {
        for (const item of defined(parent1.items, 'expected items to be present')) {
          item.id = `${item.name}-id`;
        }
      });
      await db1.flush();

      // Peer 2, unaware of peer 1's writes, reorders concurrently: a move-to-end is a delete + reinsert
      // (Automerge has no list move), so `alpha`'s old node is gone and a brand-new, pre-stamp node for
      // it lands at index 2 -- the same slot peer 1's live proxy has cached from `gamma`.
      Obj.update(parent2, (parent2) => {
        const items = defined(parent2.items, 'expected items to be present');
        const [moved] = items.splice(0, 1);
        items.push(moved);
      });
      await db2.flush();

      await heal();
      await syncAll(db1, db2);
      await expect.poll(() => findByName(parent1, 'beta').id, { timeout: 10_000 }).to.eq('beta-id');

      // Ground truth, read off the raw doc at the mount path `parent1` is materialized from.
      const rawItems = getRawItems(getObjectCore(parent1).getDoc(), parent1.id);
      const rawByName = new Map<string, Record<string, unknown>>();
      for (const item of rawItems) {
        const name = item.name;
        invariant(typeof name === 'string', 'expected element name to be a string');
        rawByName.set(name, item);
      }

      // The live proxy -- the one `Obj.update` wrote the stamps through -- must agree with the raw doc
      // for every element, including the one whose slot was reused by the reorder.
      for (const item of defined(parent1.items, 'expected items to be present')) {
        const raw = rawByName.get(item.name);
        invariant(raw, `expected a raw element named ${item.name}`);
        expect(item.id, `live proxy field 'id' for '${item.name}'`).to.eq(raw.id);
      }
    } finally {
      await builder.close();
      await network?.close();
    }
  });
});
