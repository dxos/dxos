//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Context } from '@dxos/context';
import { DXN, Filter, Obj, Query, Type } from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-client';
import { EchoTestBuilder, getObjectCore } from '@dxos/echo-client/testing';
import { TestReplicationNetwork } from '@dxos/echo-host/testing';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';

//
// M0 research spike, Track B claim 7: splitting a collection into N objects (a 1->N migration) needs
// a stable per-element key. Position isn't stable (reorders change it) and a content hash isn't stable
// across in-place edits (it mints a new object and strands the old one). This file asks whether
// Automerge's own list-element identity (`A.getObjectId`) can serve as that key. See
// `.agents/projects/lenses/TASKS.md` "Phase M0" for the claim and `migration-research.test.ts` for the
// shared harness idioms this file reuses.
//

class ListDoc extends Type.makeObject<ListDoc>(DXN.make('org.dxos.test.migration.ListDoc', '0.1.0'))(
  Schema.Struct({
    items: Schema.optional(Schema.Array(Schema.Struct({ label: Schema.optional(Schema.String) }))),
  }),
) {}

/**
 * Cross-peer visibility isn't guaranteed the instant `waitUntilHeadsReplicated`/`updateIndexes`
 * resolve, so poll for the replicated object rather than reading the query result once.
 */
const queryListDoc = async (db: EchoDatabase): Promise<ListDoc> => {
  let found: ListDoc | undefined;
  await expect
    .poll(async () => {
      [found] = await db.query(Query.select(Filter.type(ListDoc))).run();
      return found;
    })
    .toBeDefined();
  invariant(found, 'expected the replicated object to be queryable');
  return found;
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const isUnknownArray = (value: unknown): value is unknown[] => Array.isArray(value);

/**
 * Navigates the raw automerge doc's `objects.<id>.data.<prop>` path with only `unknown` + type
 * guards (never a cast): `getObjectCore(obj).getDoc()` returns `Doc<unknown>`, which exposes no
 * properties at all until narrowed at runtime.
 */
const getRawListElements = (doc: unknown, objectId: string, prop: string): unknown[] => {
  invariant(isRecord(doc), 'expected an automerge doc');
  const objects = doc.objects;
  invariant(isRecord(objects), 'expected doc.objects');
  const entity = objects[objectId];
  invariant(isRecord(entity), 'expected an entity structure');
  const data = entity.data;
  invariant(isRecord(data), 'expected entity.data');
  const list = data[prop];
  invariant(isUnknownArray(list), 'expected an array property');
  return list;
};

/** Each raw list element IS the composite value automerge tracks, so `A.getObjectId` needs no `prop`. */
const getElementObjectIds = (doc: unknown, objectId: string, prop: string): (string | null)[] =>
  getRawListElements(doc, objectId, prop).map((element) => A.getObjectId(element));

describe('migration research (M0): list element identity (claim 7)', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('claim 7a: an element ObjID is stable under an in-place edit', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [ListDoc] });
    await using db = await peer.createDatabase();

    const obj = db.add(Obj.make(ListDoc, { items: [{ label: 'a' }, { label: 'b' }, { label: 'c' }] }));
    await db.flush();

    const core = getObjectCore(obj);
    const idsBefore = getElementObjectIds(core.getDoc(), obj.id, 'items');
    // eslint-disable-next-line no-console
    console.log('claim 7a: element ObjIDs before edit ->', idsBefore);

    expect(idsBefore.length).to.eq(3);
    expect(idsBefore.every((id) => typeof id === 'string')).to.eq(true);
    expect(new Set(idsBefore).size).to.eq(3);

    Obj.update(obj, (obj) => {
      invariant(obj.items, 'expected items');
      invariant(obj.items[1], 'expected items[1]');
      obj.items[1].label = 'b-edited';
    });
    await db.flush();

    // Re-fetch the doc: automerge docs are immutable snapshots, the edit produced a new one.
    const idsAfter = getElementObjectIds(core.getDoc(), obj.id, 'items');
    // eslint-disable-next-line no-console
    console.log('claim 7a: element ObjIDs after edit ->', idsAfter);

    expect(obj.items?.[1].label).to.eq('b-edited');
    expect(idsAfter).to.deep.eq(idsBefore);
  });

  test('claim 7b: a splice-based reorder mints new identity (the expected failure mode)', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [ListDoc] });
    await using db = await peer.createDatabase();

    const obj = db.add(Obj.make(ListDoc, { items: [{ label: 'a' }, { label: 'b' }, { label: 'c' }] }));
    await db.flush();

    const core = getObjectCore(obj);
    const idsBefore = getElementObjectIds(core.getDoc(), obj.id, 'items');

    // Move item 'a' from the front to the back via remove+insert, the natural ECHO idiom for a
    // reorder (Automerge has no native list-move).
    Obj.update(obj, (obj) => {
      invariant(obj.items, 'expected items');
      const [moved] = obj.items.splice(0, 1);
      obj.items.push(moved);
    });
    await db.flush();

    const idsAfterSplice = getElementObjectIds(core.getDoc(), obj.id, 'items');
    // eslint-disable-next-line no-console
    console.log('claim 7b: ObjIDs before splice ->', idsBefore, '| after splice ->', idsAfterSplice);

    expect(obj.items?.map((item) => item.label)).to.deep.eq(['b', 'c', 'a']);
    // Observed: splicing a proxy object out and re-inserting it (even the SAME JS reference) creates
    // a brand-new automerge map at the new list position -- the old ObjID for 'a' is gone entirely and
    // a fresh one appears at the tail. Position-based remove+insert therefore does NOT preserve
    // identity: this is exactly the failure mode claim 7 flags for a splice-based reorder.
    const idOfAAfter = idsAfterSplice[2];
    const idOfAOriginal = idsBefore[0];
    expect(idOfAAfter).not.to.eq(idOfAOriginal);
    expect(idsAfterSplice.every((id) => typeof id === 'string')).to.eq(true);
    // The untouched elements ('b', 'c') keep their original identity -- only the moved slot changes.
    expect(idsAfterSplice[0]).to.eq(idsBefore[1]);
    expect(idsAfterSplice[1]).to.eq(idsBefore[2]);

    // Also try a plain-assignment "swap": overwrite index 0 with index 2's current value.
    const idsBeforeSwap = getElementObjectIds(core.getDoc(), obj.id, 'items');
    Obj.update(obj, (obj) => {
      invariant(obj.items, 'expected items');
      const third = obj.items[2];
      obj.items[0] = { label: third.label };
    });
    await db.flush();
    const idsAfterSwap = getElementObjectIds(core.getDoc(), obj.id, 'items');
    // eslint-disable-next-line no-console
    console.log('claim 7b: ObjIDs before swap ->', idsBeforeSwap, '| after swap ->', idsAfterSwap);

    // A whole-slot assignment is a `put` of a brand-new value at index 0 -- new identity there too,
    // and the other slots are untouched.
    expect(obj.items?.[0].label).to.eq('a');
    expect(idsAfterSwap[0]).not.to.eq(idsBeforeSwap[0]);
    expect(idsAfterSwap[1]).to.eq(idsBeforeSwap[1]);
    expect(idsAfterSwap[2]).to.eq(idsBeforeSwap[2]);
  });

  test('claim 7c: ObjIDs agree across peers and survive a partitioned in-place edit', async ({ expect }) => {
    const [spaceKey] = PublicKey.randomSequence();
    await using network = await new TestReplicationNetwork().open();

    await using peer1 = await builder.createPeer({ types: [ListDoc] });
    await using peer2 = await builder.createPeer({ types: [ListDoc] });
    const replicator1 = await network.createReplicator();
    const replicator2 = await network.createReplicator();
    await peer1.host.addReplicator(Context.default(), replicator1);
    await peer2.host.addReplicator(Context.default(), replicator2);

    await using db1 = await peer1.createDatabase(spaceKey);
    const obj1 = db1.add(Obj.make(ListDoc, { items: [{ label: 'a' }, { label: 'b' }, { label: 'c' }] }));
    await db1.flush();

    const rootUrl = db1.rootUrl;
    invariant(rootUrl, 'root url');
    await using db2 = await peer2.openDatabase(spaceKey, rootUrl);
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db2.updateIndexes();
    const obj2 = await queryListDoc(db2);
    expect(obj2.id).to.eq(obj1.id);

    const core1 = getObjectCore(obj1);
    const core2 = getObjectCore(obj2);
    const ids1 = getElementObjectIds(core1.getDoc(), obj1.id, 'items');
    const ids2 = getElementObjectIds(core2.getDoc(), obj2.id, 'items');
    // eslint-disable-next-line no-console
    console.log('claim 7c: peer1 ObjIDs ->', ids1, '| peer2 ObjIDs ->', ids2);
    expect(ids2).to.deep.eq(ids1);

    // Partition: sever the transport so each peer's edit is concurrent with the other's.
    await peer1.host.removeReplicator(replicator1);
    await peer2.host.removeReplicator(replicator2);

    Obj.update(obj1, (obj1) => {
      invariant(obj1.items, 'expected items');
      invariant(obj1.items[0], 'expected items[0]');
      obj1.items[0].label = 'a-edited-by-peer1';
    });
    await db1.flush();
    Obj.update(obj2, (obj2) => {
      invariant(obj2.items, 'expected items');
      invariant(obj2.items[2], 'expected items[2]');
      obj2.items[2].label = 'c-edited-by-peer2';
    });
    await db2.flush();

    // Heal: reconnect with fresh replicator instances (re-adding removed ones is unexplored/unneeded).
    await peer1.host.addReplicator(Context.default(), await network.createReplicator());
    await peer2.host.addReplicator(Context.default(), await network.createReplicator());
    await db1.waitUntilHeadsReplicated(await db2.getDocumentHeads());
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db1.updateIndexes();
    await db2.updateIndexes();

    await expect.poll(() => obj1.items?.[2].label).toBe('c-edited-by-peer2');
    await expect.poll(() => obj2.items?.[0].label).toBe('a-edited-by-peer1');

    const idsAfterHeal1 = getElementObjectIds(core1.getDoc(), obj1.id, 'items');
    const idsAfterHeal2 = getElementObjectIds(core2.getDoc(), obj2.id, 'items');
    // eslint-disable-next-line no-console
    console.log('claim 7c: after heal peer1 ->', idsAfterHeal1, '| peer2 ->', idsAfterHeal2);

    // ObjIDs are op-ids embedded in replicated history: concurrent in-place edits to DIFFERENT
    // elements never touch element identity, so both peers converge on the SAME, UNCHANGED ObjIDs.
    expect(idsAfterHeal1).to.deep.eq(ids1);
    expect(idsAfterHeal2).to.deep.eq(ids1);
  });

  test('claim 7d: concurrent inserts from partitioned peers keep distinct, cross-peer-agreed identity', async ({
    expect,
  }) => {
    const [spaceKey] = PublicKey.randomSequence();
    await using network = await new TestReplicationNetwork().open();

    await using peer1 = await builder.createPeer({ types: [ListDoc] });
    await using peer2 = await builder.createPeer({ types: [ListDoc] });
    const replicator1 = await network.createReplicator();
    const replicator2 = await network.createReplicator();
    await peer1.host.addReplicator(Context.default(), replicator1);
    await peer2.host.addReplicator(Context.default(), replicator2);

    await using db1 = await peer1.createDatabase(spaceKey);
    const obj1 = db1.add(Obj.make(ListDoc, { items: [{ label: 'a' }, { label: 'b' }, { label: 'c' }] }));
    await db1.flush();

    const rootUrl = db1.rootUrl;
    invariant(rootUrl, 'root url');
    await using db2 = await peer2.openDatabase(spaceKey, rootUrl);
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db2.updateIndexes();
    const obj2 = await queryListDoc(db2);

    // Partition: sever the transport so each peer's insert is concurrent with the other's.
    await peer1.host.removeReplicator(replicator1);
    await peer2.host.removeReplicator(replicator2);

    Obj.update(obj1, (obj1) => {
      invariant(obj1.items, 'expected items');
      obj1.items.push({ label: 'inserted-by-peer1' });
    });
    await db1.flush();
    Obj.update(obj2, (obj2) => {
      invariant(obj2.items, 'expected items');
      obj2.items.push({ label: 'inserted-by-peer2' });
    });
    await db2.flush();

    // Heal: reconnect with fresh replicator instances.
    await peer1.host.addReplicator(Context.default(), await network.createReplicator());
    await peer2.host.addReplicator(Context.default(), await network.createReplicator());
    await db1.waitUntilHeadsReplicated(await db2.getDocumentHeads());
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db1.updateIndexes();
    await db2.updateIndexes();

    // Automerge merges concurrent list inserts (no data is lost): both new elements survive on both
    // peers, giving 5 total.
    await expect.poll(() => obj1.items?.length).toBe(5);
    await expect.poll(() => obj2.items?.length).toBe(5);

    const core1 = getObjectCore(obj1);
    const core2 = getObjectCore(obj2);
    const ids1 = getElementObjectIds(core1.getDoc(), obj1.id, 'items');
    const ids2 = getElementObjectIds(core2.getDoc(), obj2.id, 'items');
    // eslint-disable-next-line no-console
    console.log('claim 7d: peer1 labels/ObjIDs ->', obj1.items, ids1, '| peer2 ->', obj2.items, ids2);

    // Every element -- old and newly inserted -- has a distinct ObjID, and both peers agree on the
    // full ordered set (Automerge's list-insert merge is deterministic across replicas).
    expect(new Set(ids1).size).to.eq(5);
    expect(ids2).to.deep.eq(ids1);

    const labels1 = obj1.items?.map((item) => item.label);
    const labelToId1 = new Map(labels1?.map((label, index) => [label, ids1[index]]));
    const idOfPeer1Insert = labelToId1.get('inserted-by-peer1');
    const idOfPeer2Insert = labelToId1.get('inserted-by-peer2');
    expect(typeof idOfPeer1Insert).to.eq('string');
    expect(typeof idOfPeer2Insert).to.eq('string');
    expect(idOfPeer1Insert).not.to.eq(idOfPeer2Insert);

    const labels2 = obj2.items?.map((item) => item.label);
    const labelToId2 = new Map(labels2?.map((label, index) => [label, ids2[index]]));
    expect(labelToId2.get('inserted-by-peer1')).to.eq(idOfPeer1Insert);
    expect(labelToId2.get('inserted-by-peer2')).to.eq(idOfPeer2Insert);
  });
});
