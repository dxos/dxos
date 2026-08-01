//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { sleep } from '@dxos/async';
import { Context } from '@dxos/context';
import { DXN, Filter, Obj, Query, Relation, Type } from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-client';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { TestReplicationNetwork } from '@dxos/echo-host/testing';
import { invariant } from '@dxos/invariant';
import { EntityId, PublicKey } from '@dxos/keys';

//
// M0 Track B research spike: entity-lifecycle claims (ledger claims 6, 8, and the tombstone residue
// of 10/11). See `.agents/projects/lenses/DESIGN.md` §10.3/§10.5 for the hypotheses under test and
// `migration-research.test.ts` (Track A) for the harness idioms this file reuses verbatim.
//

/** Declares both a task-shaped and a split-address-shaped test object, all fields optional. */
class TaskDoc extends Type.makeObject<TaskDoc>(DXN.make('org.dxos.test.migration.entities.TaskDoc', '0.1.0'))(
  Schema.Struct({
    title: Schema.optional(Schema.String),
    name: Schema.optional(Schema.String),
  }),
) {}

/** Local person-shaped type for the claim-8 relation scenario, mirroring `TestSchema.Person`. */
class Person extends Type.makeObject<Person>(DXN.make('org.dxos.test.migration.entities.Person', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
  }),
) {}

/** Local relation type, mirroring `TestSchema.HasManager` (source/target both `Person`). */
class HasManager extends Type.makeRelation<HasManager>(
  DXN.make('org.dxos.test.migration.entities.HasManager', '0.1.0'),
)({
  source: Person,
  target: Person,
})(Schema.Struct({})) {}

/**
 * Cross-peer visibility isn't guaranteed the instant `waitUntilHeadsReplicated`/`updateIndexes`
 * resolve, so poll for the replicated object rather than reading the query result once.
 */
const queryTaskDoc = async (db: EchoDatabase): Promise<TaskDoc> => {
  let found: TaskDoc | undefined;
  await expect
    .poll(async () => {
      [found] = await db.query(Query.select(Filter.type(TaskDoc))).run();
      return found;
    })
    .toBeDefined();
  invariant(found, 'expected the replicated object to be queryable');
  return found;
};

/**
 * Polls for a relation of the given type on `db`, asserting that a thrown query error fails the
 * test immediately (with a distinct message) rather than being retried away — a throw during the
 * heal is exactly the failure mode claim 8 predicts must NOT happen.
 */
const pollForRelationWithoutThrowing = async (db: EchoDatabase, timeoutMs: number): Promise<HasManager | undefined> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    let results: HasManager[];
    try {
      results = await db.query(Query.select(Filter.type(HasManager))).run();
    } catch (error) {
      throw new Error(
        `db.query threw while polling for the cross-peer relation to surface ` +
          `(claim 8 predicts exclusion, never an error): ${String(error)}`,
        { cause: error },
      );
    }
    if (results.length > 0) {
      return results[0];
    }
    await sleep(50);
  }
  return undefined;
};

describe('migration research (M0) — entity lifecycle', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('claim 6a: same id minted by two partitioned peers orphans one document silently', async ({ expect }) => {
    const [spaceKey] = PublicKey.randomSequence();
    await using network = await new TestReplicationNetwork().open();

    await using peer1 = await builder.createPeer({ types: [TaskDoc] });
    await using peer2 = await builder.createPeer({ types: [TaskDoc] });
    const replicator1 = await network.createReplicator();
    const replicator2 = await network.createReplicator();
    await peer1.host.addReplicator(Context.default(), replicator1);
    await peer2.host.addReplicator(Context.default(), replicator2);

    await using db1 = await peer1.createDatabase(spaceKey);
    const initial = db1.add(Obj.make(TaskDoc, { title: 'initial' }));
    await db1.flush();

    const rootUrl = db1.rootUrl;
    invariant(rootUrl, 'root url');
    await using db2 = await peer2.openDatabase(spaceKey, rootUrl);
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db2.updateIndexes();
    const initialOnPeer2 = await queryTaskDoc(db2);
    expect(initialOnPeer2.id).to.eq(initial.id);

    // Partition: sever the transport so neither peer can observe the other's write.
    await peer1.host.removeReplicator(replicator1);
    await peer2.host.removeReplicator(replicator2);

    const SHARED_ID = EntityId.random();
    db1.add(Obj.make(TaskDoc, { id: SHARED_ID, title: 'from peer 1' }));
    await db1.flush();
    db2.add(Obj.make(TaskDoc, { id: SHARED_ID, title: 'from peer 2' }));
    await db2.flush();

    // Heal: reconnect with fresh replicator instances, sync both ways.
    const healReplicator1 = await network.createReplicator();
    const healReplicator2 = await network.createReplicator();
    await peer1.host.addReplicator(Context.default(), healReplicator1);
    await peer2.host.addReplicator(Context.default(), healReplicator2);
    await db1.waitUntilHeadsReplicated(await db2.getDocumentHeads());
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db1.updateIndexes();
    await db2.updateIndexes();

    // Poll generously: give the merge every chance to settle before reading a verdict off it.
    let peer1Results: TaskDoc[] = [];
    let peer2Results: TaskDoc[] = [];
    await expect
      .poll(
        async () => {
          peer1Results = await db1.query(Filter.id(SHARED_ID)).run();
          peer2Results = await db2.query(Filter.id(SHARED_ID)).run();
          return peer1Results.length > 0 && peer2Results.length > 0;
        },
        { timeout: 10_000 },
      )
      .toBe(true);

    // No error is thrown anywhere: the collision resolves silently, which IS the claim-6 finding.
    // Exactly one document ever answers to `SHARED_ID` on each peer — the other was orphaned, not
    // merged alongside it (there are two documents, not one CRDT-merged object).
    expect(peer1Results.length).to.eq(1);
    expect(peer2Results.length).to.eq(1);

    // eslint-disable-next-line no-console
    console.log(
      'claim 6a: peer 1 sees title ->',
      peer1Results[0].title,
      '| peer 2 sees title ->',
      peer2Results[0].title,
    );

    // A SECOND full partition+heal round, run before reading a final verdict, distinguishes a
    // transient sync-timing artifact from a permanent divergence.
    await peer1.host.removeReplicator(healReplicator1);
    await peer2.host.removeReplicator(healReplicator2);
    await peer1.host.addReplicator(Context.default(), await network.createReplicator());
    await peer2.host.addReplicator(Context.default(), await network.createReplicator());
    await db1.waitUntilHeadsReplicated(await db2.getDocumentHeads());
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db1.updateIndexes();
    await db2.updateIndexes();
    await sleep(500);
    const peer1Winner = (await db1.query(Filter.id(SHARED_ID)).run())[0]?.title;
    const peer2Winner = (await db2.query(Filter.id(SHARED_ID)).run())[0]?.title;

    // ACTUAL FINDING (stronger than the predicted orphaning): the peers DISAGREE, permanently. Each
    // peer keeps seeing the title IT WROTE ITSELF, even after a second full heal round changes
    // nothing. Root cause traced to `entity-manager.ts` `_loadLinkedObjects`: the FIRST url a peer
    // ever bound locally for an objectId is cached in `_objectDocumentHandles` and never revisited —
    // a later change to `links[SHARED_ID]` (even one that changes the map's merged/current value)
    // is only ever logged (`'object already inlined in a different document, ignoring the link'`)
    // and dropped. So this is not `links[id]` LWW disagreeing across peers (a single Automerge map
    // register is a pure function of the merged op-set and must compute identically everywhere) —
    // it is each peer's own first-writer-wins CLIENT CACHE, layered on top of that map, permanently
    // diverging from whatever the map's current value actually is.
    expect(peer1Winner).to.eq('from peer 1');
    expect(peer2Winner).to.eq('from peer 2');

    // Each peer's own write is reachable via ITS OWN normal query; the OTHER peer's write is
    // unreachable via a normal query on either side — orphaned, not merely "eventually resolved".
    expect((await db1.query(Filter.id(SHARED_ID)).run()).some((obj) => obj.title === 'from peer 2')).to.eq(false);
    expect((await db2.query(Filter.id(SHARED_ID)).run()).some((obj) => obj.title === 'from peer 1')).to.eq(false);
  });

  test('claim 6b: same identity key on distinct ids — both survive, nothing lost', async ({ expect }) => {
    const [spaceKey] = PublicKey.randomSequence();
    await using network = await new TestReplicationNetwork().open();

    await using peer1 = await builder.createPeer({ types: [TaskDoc] });
    await using peer2 = await builder.createPeer({ types: [TaskDoc] });
    const replicator1 = await network.createReplicator();
    const replicator2 = await network.createReplicator();
    await peer1.host.addReplicator(Context.default(), replicator1);
    await peer2.host.addReplicator(Context.default(), replicator2);

    await using db1 = await peer1.createDatabase(spaceKey);
    const initial = db1.add(Obj.make(TaskDoc, { title: 'initial' }));
    await db1.flush();

    const rootUrl = db1.rootUrl;
    invariant(rootUrl, 'root url');
    await using db2 = await peer2.openDatabase(spaceKey, rootUrl);
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db2.updateIndexes();
    const initialOnPeer2 = await queryTaskDoc(db2);
    expect(initialOnPeer2.id).to.eq(initial.id);

    // Partition: both peers fan out the SAME source into an `address` split, independently.
    await peer1.host.removeReplicator(replicator1);
    await peer2.host.removeReplicator(replicator2);

    const sourceId = EntityId.random();
    const identityKey = `org.dxos.test.lens.split:${sourceId}:address`;
    const objA = db1.add(
      Obj.make(TaskDoc, { [Obj.Meta]: { key: identityKey, version: '1.0.0' }, title: 'peer 1 address' }),
    );
    await db1.flush();
    const objB = db2.add(
      Obj.make(TaskDoc, { [Obj.Meta]: { key: identityKey, version: '1.0.0' }, title: 'peer 2 address' }),
    );
    await db2.flush();

    // Heal: reconnect with fresh replicator instances, sync both ways.
    await peer1.host.addReplicator(Context.default(), await network.createReplicator());
    await peer2.host.addReplicator(Context.default(), await network.createReplicator());
    await db1.waitUntilHeadsReplicated(await db2.getDocumentHeads());
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db1.updateIndexes();
    await db2.updateIndexes();

    // Both objects, distinct random ids, reach both peers — the split's premise: random id + a
    // shared identity key never collides at the `links` map (unlike claim 6a's shared-id case).
    await expect
      .poll(async () => (await db1.query(Query.select(Filter.type(TaskDoc))).run()).length, { timeout: 10_000 })
      .toBe(3); // initial + objA + objB
    await expect
      .poll(async () => (await db2.query(Query.select(Filter.type(TaskDoc))).run()).length, { timeout: 10_000 })
      .toBe(3);

    // Both are addressable by their shared identity key, on both peers — the substrate contract a
    // future merge engine assumes: duplicates are VISIBLE and addressable, awaiting collapse. Note:
    // the collapse itself (deciding these two ARE duplicates and merging them) is out of scope here —
    // no merge engine exists yet; this test only proves the substrate does not lose or hide either.
    const byKeyOnPeer1 = await db1.query(Filter.key(identityKey, { version: '1.0.0' })).run();
    const byKeyOnPeer2 = await db2.query(Filter.key(identityKey, { version: '1.0.0' })).run();
    expect(byKeyOnPeer1.map((obj) => obj.id).sort()).to.deep.eq([objA.id, objB.id].sort());
    expect(byKeyOnPeer2.map((obj) => obj.id).sort()).to.deep.eq([objA.id, objB.id].sort());

    // The identity key itself replicated onto both copies, on both peers.
    for (const obj of byKeyOnPeer1) {
      expect(Obj.getMeta(obj).key).to.eq(identityKey);
    }
    for (const obj of byKeyOnPeer2) {
      expect(Obj.getMeta(obj).key).to.eq(identityKey);
    }

    // Neither peer's content was lost: both titles are present, on both peers.
    const titlesOnPeer1 = byKeyOnPeer1.map((obj) => obj.title).sort();
    const titlesOnPeer2 = byKeyOnPeer2.map((obj) => obj.title).sort();
    expect(titlesOnPeer1).to.deep.eq(['peer 1 address', 'peer 2 address']);
    expect(titlesOnPeer2).to.deep.eq(['peer 1 address', 'peer 2 address']);
  });

  test('claim 8: a relation replicating ahead of its endpoints degrades gracefully', async ({ expect }) => {
    const [spaceKey] = PublicKey.randomSequence();
    await using network = await new TestReplicationNetwork().open();

    await using peer1 = await builder.createPeer({ types: [TaskDoc, Person, HasManager] });
    await using peer2 = await builder.createPeer({ types: [TaskDoc, Person, HasManager] });
    const replicator1 = await network.createReplicator();
    const replicator2 = await network.createReplicator();
    await peer1.host.addReplicator(Context.default(), replicator1);
    await peer2.host.addReplicator(Context.default(), replicator2);

    await using db1 = await peer1.createDatabase(spaceKey);
    const initial = db1.add(Obj.make(TaskDoc, { title: 'initial' }));
    await db1.flush();

    const rootUrl = db1.rootUrl;
    invariant(rootUrl, 'root url');
    await using db2 = await peer2.openDatabase(spaceKey, rootUrl);
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db2.updateIndexes();
    const initialOnPeer2 = await queryTaskDoc(db2);
    expect(initialOnPeer2.id).to.eq(initial.id);

    // Partition: peer 1 creates two new endpoints AND a relation between them, all in one go, so a
    // real cross-peer replication race between the relation doc and its endpoint docs is possible.
    await peer1.host.removeReplicator(replicator1);
    await peer2.host.removeReplicator(replicator2);

    const alice = db1.add(Obj.make(Person, { name: 'Alice' }));
    const bob = db1.add(Obj.make(Person, { name: 'Bob' }));
    const hasManager = db1.add(Relation.make(HasManager, { [Relation.Source]: bob, [Relation.Target]: alice }));
    await db1.flush();

    // Before healing: no error possible yet (peer 2 has never heard of any of this) — recorded only
    // to establish the baseline, not asserted on.
    const before = await db2.query(Query.select(Filter.type(HasManager))).run();
    // eslint-disable-next-line no-console
    console.log('claim 8: relation count on peer 2 before healing ->', before.length);

    // Heal: reconnect with fresh replicator instances, sync both ways.
    await peer1.host.addReplicator(Context.default(), await network.createReplicator());
    await peer2.host.addReplicator(Context.default(), await network.createReplicator());
    await db1.waitUntilHeadsReplicated(await db2.getDocumentHeads());
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db1.updateIndexes();
    await db2.updateIndexes();

    // Poll on peer 2 for the relation to surface, WITHOUT ever tolerating a thrown query error —
    // strong-deps-stall.test.ts already proved the single-peer mechanism (exclude, no error,
    // self-heal); this is the cross-peer variant our two-peer harness enables.
    const relationOnPeer2 = await pollForRelationWithoutThrowing(db2, 10_000);
    invariant(relationOnPeer2, 'expected the relation to eventually surface on peer 2');
    expect(relationOnPeer2.id).to.eq(hasManager.id);

    // Once surfaced, both endpoints resolve — never throw, never dangle.
    const source = Relation.getSource(relationOnPeer2);
    const target = Relation.getTarget(relationOnPeer2);
    expect(source.id).to.eq(bob.id);
    expect(target.id).to.eq(alice.id);
    expect(source.name).to.eq('Bob');
    expect(target.name).to.eq('Alice');

    // Re-poll once more, again asserting no throw: the surfaced state is stable, not a fluke.
    const relationOnPeer2Again = await pollForRelationWithoutThrowing(db2, 2_000);
    invariant(relationOnPeer2Again, 'relation must remain queryable once surfaced');
    expect(relationOnPeer2Again.id).to.eq(hasManager.id);
  });

  test('tombstone: a late write to a removed object survives beneath the tombstone', async ({ expect }) => {
    const [spaceKey] = PublicKey.randomSequence();
    await using network = await new TestReplicationNetwork().open();

    await using peer1 = await builder.createPeer({ types: [TaskDoc] });
    await using peer2 = await builder.createPeer({ types: [TaskDoc] });
    const replicator1 = await network.createReplicator();
    const replicator2 = await network.createReplicator();
    await peer1.host.addReplicator(Context.default(), replicator1);
    await peer2.host.addReplicator(Context.default(), replicator2);

    await using db1 = await peer1.createDatabase(spaceKey);
    const obj1 = db1.add(Obj.make(TaskDoc, { title: 'original' }));
    await db1.flush();

    const rootUrl = db1.rootUrl;
    invariant(rootUrl, 'root url');
    await using db2 = await peer2.openDatabase(spaceKey, rootUrl);
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db2.updateIndexes();
    const obj2 = await queryTaskDoc(db2);
    expect(obj2.id).to.eq(obj1.id);

    // Partition: peer 1's tombstone and peer 2's late edit become concurrent — the fan-in scenario
    // where a migration has absorbed the child and removed it, but an old client keeps writing.
    await peer1.host.removeReplicator(replicator1);
    await peer2.host.removeReplicator(replicator2);

    db1.remove(obj1);
    await db1.flush();

    Obj.update(obj2, (obj2) => {
      obj2.title = 'late edit';
    });
    await db2.flush();

    // Heal: reconnect with fresh replicator instances, sync both ways.
    await peer1.host.addReplicator(Context.default(), await network.createReplicator());
    await peer2.host.addReplicator(Context.default(), await network.createReplicator());
    await db1.waitUntilHeadsReplicated(await db2.getDocumentHeads());
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db1.updateIndexes();
    await db2.updateIndexes();

    // Default queries on both peers still exclude the object: the tombstone was NOT resurrected by
    // the concurrent late write.
    await expect
      .poll(async () => (await db1.query(Query.select(Filter.type(TaskDoc))).run()).some((obj) => obj.id === obj1.id))
      .toBe(false);
    await expect
      .poll(async () => (await db2.query(Query.select(Filter.type(TaskDoc))).run()).some((obj) => obj.id === obj2.id))
      .toBe(false);

    // A `deleted: 'include'` query finds it WITH the late edit intact — the late data survives
    // beneath the tombstone rather than being lost alongside the deletion.
    const queryIncludingDeleted = (db: EchoDatabase, id: TaskDoc['id']): Promise<TaskDoc[]> =>
      db
        .query(Query.select(Filter.type(TaskDoc)).options({ deleted: 'include' }))
        .run()
        .then((results) => results.filter((obj) => obj.id === id));

    let deletedOnPeer1: TaskDoc | undefined;
    await expect
      .poll(async () => {
        [deletedOnPeer1] = await queryIncludingDeleted(db1, obj1.id);
        return deletedOnPeer1?.title;
      })
      .toBe('late edit');
    invariant(deletedOnPeer1, 'expected the tombstoned object to be queryable with deleted: include');

    let deletedOnPeer2: TaskDoc | undefined;
    await expect
      .poll(async () => {
        [deletedOnPeer2] = await queryIncludingDeleted(db2, obj2.id);
        return deletedOnPeer2?.title;
      })
      .toBe('late edit');
    invariant(deletedOnPeer2, 'expected the tombstoned object to be queryable with deleted: include');

    // Un-delete idiom: `db.add` on an object the database already tracks un-deletes it
    // (`entity-manager.ts` `addCore` calls `core.setDeleted(false)` when `core.entityManager ===
    // this`), so re-adding the QUERIED handle resurrects it rather than creating a new object.
    db2.add(deletedOnPeer2);
    await db2.flush();

    // It resurfaces in default queries on BOTH peers, with the late edit intact.
    await expect.poll(() => deletedOnPeer2?.title).toBe('late edit');
    await expect
      .poll(async () => (await db2.query(Query.select(Filter.type(TaskDoc))).run()).some((obj) => obj.id === obj2.id))
      .toBe(true);

    await db1.waitUntilHeadsReplicated(await db2.getDocumentHeads());
    await db1.updateIndexes();
    await expect
      .poll(async () => (await db1.query(Query.select(Filter.type(TaskDoc))).run()).some((obj) => obj.id === obj1.id))
      .toBe(true);
    const resurrectedOnPeer1 = (await db1.query(Query.select(Filter.type(TaskDoc))).run()).find(
      (obj) => obj.id === obj1.id,
    );
    invariant(resurrectedOnPeer1, 'expected the resurrected object to reach peer 1');
    expect(resurrectedOnPeer1.title).to.eq('late edit');
  });
});
