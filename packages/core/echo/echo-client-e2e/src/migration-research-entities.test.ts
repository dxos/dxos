//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { sleep } from '@dxos/async';
import { Context } from '@dxos/context';
import { DXN, Filter, Obj, Query, Ref, Relation, Type } from '@dxos/echo';
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

/**
 * Declares a task-shaped, split-address-shaped, and fan-in/fan-out-shaped test object, all fields
 * optional: `address` is the claim-9 split source; `parentId` is its cheap back-reference;
 * `assigneeName` is the claim-10 fan-in target; `refProp` is the claim-11 fan-in reference.
 */
class TaskDoc extends Type.makeObject<TaskDoc>(DXN.make('org.dxos.test.migration.entities.TaskDoc', '0.1.0'))(
  Schema.Struct({
    title: Schema.optional(Schema.String),
    name: Schema.optional(Schema.String),
    address: Schema.optional(Schema.String),
    parentId: Schema.optional(Schema.String),
    assigneeName: Schema.optional(Schema.String),
    refProp: Schema.optional(Schema.suspend((): Ref.RefSchema<TaskDoc> => Ref.Ref(TaskDoc))),
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

/** Parses a `"<houseNumber> <street>"` address; a value with no leading house number is rejected. */
const parseAddress = (raw: string): { houseNumber: string; street: string } | undefined => {
  const match = /^(\d+)\s+(.+)$/.exec(raw.trim());
  return match ? { houseNumber: match[1], street: match[2] } : undefined;
};

type FoldResult = { created: true } | { created: false; reason: string };

/**
 * Folds `parent.address` into a new extracted object stamped with a derived identity key — a
 * parse failure leaves `parent.address` untouched and reports rather than half-creating (claim 9's
 * partial-transform contract).
 */
const foldAddressSplit = (db: EchoDatabase, parent: TaskDoc): FoldResult => {
  const raw = parent.address;
  invariant(raw, 'expected parent to carry the source address property');
  const parsed = parseAddress(raw);
  if (!parsed) {
    return { created: false, reason: `unparseable address: ${JSON.stringify(raw)}` };
  }
  const identityKey = `org.dxos.test.lens.split:${parent.id}:address`;
  db.add(
    Obj.make(TaskDoc, {
      [Obj.Meta]: { key: identityKey, version: '1.0.0' },
      address: raw,
      parentId: parent.id,
    }),
  );
  return { created: true };
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

  test('claim 9: fan-out under a late write needs no find-or-create atomicity; a partial transform must not half-create', async ({
    expect,
  }) => {
    const [spaceKey] = PublicKey.randomSequence();
    await using network = await new TestReplicationNetwork().open();

    await using peer1 = await builder.createPeer({ types: [TaskDoc] });
    await using peer2 = await builder.createPeer({ types: [TaskDoc] });
    const replicator1 = await network.createReplicator();
    const replicator2 = await network.createReplicator();
    await peer1.host.addReplicator(Context.default(), replicator1);
    await peer2.host.addReplicator(Context.default(), replicator2);

    await using db1 = await peer1.createDatabase(spaceKey);
    // Two parents, as if the split migration had already run conceptually: one will receive a
    // parseable late write, the other an unparseable one.
    const parentGood = db1.add(Obj.make(TaskDoc, { title: 'parent good' }));
    const parentBad = db1.add(Obj.make(TaskDoc, { title: 'parent bad' }));
    await db1.flush();

    const rootUrl = db1.rootUrl;
    invariant(rootUrl, 'root url');
    await using db2 = await peer2.openDatabase(spaceKey, rootUrl);
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db2.updateIndexes();
    await expect.poll(async () => (await db2.query(Query.select(Filter.type(TaskDoc))).run()).length).toBe(2);

    // Partition: peer 2, an old-schema client, writes the source property directly.
    await peer1.host.removeReplicator(replicator1);
    await peer2.host.removeReplicator(replicator2);

    const parentGoodOnPeer2 = (await db2.query(Filter.id(parentGood.id)).run())[0];
    const parentBadOnPeer2 = (await db2.query(Filter.id(parentBad.id)).run())[0];
    invariant(parentGoodOnPeer2 && parentBadOnPeer2, 'expected both parents to be present on peer 2');
    Obj.update(parentGoodOnPeer2, (parentGoodOnPeer2) => {
      parentGoodOnPeer2.address = '42 Elm St';
    });
    Obj.update(parentBadOnPeer2, (parentBadOnPeer2) => {
      parentBadOnPeer2.address = 'garbage';
    });
    await db2.flush();

    // Heal round 1: reconnect, sync both ways — now both peers can see the late writes.
    const healReplicator1 = await network.createReplicator();
    const healReplicator2 = await network.createReplicator();
    await peer1.host.addReplicator(Context.default(), healReplicator1);
    await peer2.host.addReplicator(Context.default(), healReplicator2);
    await db1.waitUntilHeadsReplicated(await db2.getDocumentHeads());
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db1.updateIndexes();
    await db2.updateIndexes();
    await expect.poll(async () => (await db1.query(Filter.id(parentGood.id)).run())[0]?.address).toBe('42 Elm St');

    // Partial-transform half: peer 2 folds the unparseable address — no object created, the source
    // property untouched, and the rejection reported rather than silently discarded.
    const parentBadOnDb2 = (await db2.query(Filter.id(parentBad.id)).run())[0];
    invariant(parentBadOnDb2, 'expected parentBad to be present on peer 2');
    const countBeforeReject = (await db2.query(Query.select(Filter.type(TaskDoc))).run()).length;
    const rejectResult = foldAddressSplit(db2, parentBadOnDb2);
    expect(rejectResult).to.deep.eq({ created: false, reason: 'unparseable address: "garbage"' });
    expect((await db2.query(Query.select(Filter.type(TaskDoc))).run()).length).to.eq(countBeforeReject);
    expect(parentBadOnDb2.address).to.eq('garbage');

    // Partition again: neither peer's fold is coordinated with the other's — each independently
    // derives the SAME extracted object from the SAME already-synced late write.
    await peer1.host.removeReplicator(healReplicator1);
    await peer2.host.removeReplicator(healReplicator2);

    const parentGoodOnDb1 = (await db1.query(Filter.id(parentGood.id)).run())[0];
    const parentGoodOnDb2 = (await db2.query(Filter.id(parentGood.id)).run())[0];
    invariant(parentGoodOnDb1 && parentGoodOnDb2, 'expected parentGood to be present on both peers');
    expect(foldAddressSplit(db1, parentGoodOnDb1)).to.deep.eq({ created: true });
    expect(foldAddressSplit(db2, parentGoodOnDb2)).to.deep.eq({ created: true });
    await db1.flush();
    await db2.flush();

    // Heal round 2: reconnect, sync both ways.
    await peer1.host.addReplicator(Context.default(), await network.createReplicator());
    await peer2.host.addReplicator(Context.default(), await network.createReplicator());
    await db1.waitUntilHeadsReplicated(await db2.getDocumentHeads());
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db1.updateIndexes();
    await db2.updateIndexes();

    const identityKey = `org.dxos.test.lens.split:${parentGood.id}:address`;
    // Both duplicates reach both peers — create-with-key needs no find-or-create atomicity;
    // collapsing them is the (still absent) merge engine's job, per claim 6b.
    await expect
      .poll(async () => (await db1.query(Filter.key(identityKey, { version: '1.0.0' })).run()).length, {
        timeout: 10_000,
      })
      .toBe(2);
    await expect
      .poll(async () => (await db2.query(Filter.key(identityKey, { version: '1.0.0' })).run()).length, {
        timeout: 10_000,
      })
      .toBe(2);

    const extractedOnPeer1 = await db1.query(Filter.key(identityKey, { version: '1.0.0' })).run();
    const extractedOnPeer2 = await db2.query(Filter.key(identityKey, { version: '1.0.0' })).run();
    for (const obj of [...extractedOnPeer1, ...extractedOnPeer2]) {
      expect(Obj.getMeta(obj).key).to.eq(identityKey);
      // Deterministic transform ⇒ identical duplicate content, not just an identical key.
      expect(obj.address).to.eq('42 Elm St');
      expect(obj.parentId).to.eq(parentGood.id);
    }
  });

  test('claim 10: fan-in collides — concurrent folds into one parent property lose one side silently', async ({
    expect,
  }) => {
    const [spaceKey] = PublicKey.randomSequence();
    await using network = await new TestReplicationNetwork().open();

    await using peer1 = await builder.createPeer({ types: [TaskDoc] });
    await using peer2 = await builder.createPeer({ types: [TaskDoc] });
    const replicator1 = await network.createReplicator();
    const replicator2 = await network.createReplicator();
    await peer1.host.addReplicator(Context.default(), replicator1);
    await peer2.host.addReplicator(Context.default(), replicator2);

    await using db1 = await peer1.createDatabase(spaceKey);
    const parent = db1.add(Obj.make(TaskDoc, { title: 'parent' }));
    await db1.flush();

    const rootUrl = db1.rootUrl;
    invariant(rootUrl, 'root url');
    await using db2 = await peer2.openDatabase(spaceKey, rootUrl);
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db2.updateIndexes();
    const parentOnPeer2 = await queryTaskDoc(db2);
    expect(parentOnPeer2.id).to.eq(parent.id);

    // Partition: two independent folds concurrently target the SAME parent property, from
    // different sources — the fan-in case that contends by construction, unlike claim 9's fan-out.
    await peer1.host.removeReplicator(replicator1);
    await peer2.host.removeReplicator(replicator2);

    db1.add(Obj.make(TaskDoc, { title: 'source A', assigneeName: 'Alice' }));
    Obj.update(parent, (parent) => {
      parent.assigneeName = 'Alice';
    });
    await db1.flush();

    db2.add(Obj.make(TaskDoc, { title: 'source B', assigneeName: 'Bob' }));
    Obj.update(parentOnPeer2, (parentOnPeer2) => {
      parentOnPeer2.assigneeName = 'Bob';
    });
    await db2.flush();

    // Heal: reconnect, sync both ways.
    await peer1.host.addReplicator(Context.default(), await network.createReplicator());
    await peer2.host.addReplicator(Context.default(), await network.createReplicator());
    await db1.waitUntilHeadsReplicated(await db2.getDocumentHeads());
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db1.updateIndexes();
    await db2.updateIndexes();

    // A merged Automerge register is a pure function of the op-set, so both peers must compute the
    // SAME value — poll for that agreement rather than asserting a specific winner up front.
    let peer1Value: string | undefined;
    let peer2Value: string | undefined;
    await expect
      .poll(
        async () => {
          peer1Value = (await db1.query(Filter.id(parent.id)).run())[0]?.assigneeName;
          peer2Value = (await db2.query(Filter.id(parent.id)).run())[0]?.assigneeName;
          return peer1Value !== undefined && peer1Value === peer2Value;
        },
        { timeout: 10_000 },
      )
      .toBe(true);

    // eslint-disable-next-line no-console
    console.log('claim 10: fan-in winner (deterministic across both peers) ->', peer1Value);

    expect(peer1Value).to.eq(peer2Value);
    expect(['Alice', 'Bob']).to.include(peer1Value);
    const losingValue = peer1Value === 'Alice' ? 'Bob' : 'Alice';

    // The finding: the losing value is GONE from the parent property — silent loss, no CRDT
    // conflict record, at the property level.
    expect(peer1Value).to.not.eq(losingValue);

    // Recoverability: the losing value still lives on its OWN source object, untouched by the
    // property collision — a migration-declared resolution could re-derive it from there.
    const sourcesOnPeer1 = await db1.query(Query.select(Filter.type(TaskDoc))).run();
    const loserSource = sourcesOnPeer1.find((obj) => obj.assigneeName === losingValue && obj.id !== parent.id);
    invariant(loserSource, 'expected the losing source object to remain queryable');
    expect(loserSource.assigneeName).to.eq(losingValue);

    // No defensible default exists at the property level: the migration must declare the
    // resolution itself — ordering, relation-kind priority, or reject-and-record like claim 5's
    // conflict records.
  });

  test('claim 11: referrer cardinality is queryable before a fan-in runs', async ({ expect }) => {
    const [spaceKey] = PublicKey.randomSequence();
    await using network = await new TestReplicationNetwork().open();

    await using peer1 = await builder.createPeer({ types: [TaskDoc] });
    await using peer2 = await builder.createPeer({ types: [TaskDoc] });
    const replicator1 = await network.createReplicator();
    const replicator2 = await network.createReplicator();
    await peer1.host.addReplicator(Context.default(), replicator1);
    await peer2.host.addReplicator(Context.default(), replicator2);

    await using db1 = await peer1.createDatabase(spaceKey);
    const child = db1.add(Obj.make(TaskDoc, { title: 'shared child' }));
    const parentA = db1.add(Obj.make(TaskDoc, { title: 'parent A', refProp: Ref.make(child) }));
    const parentB = db1.add(Obj.make(TaskDoc, { title: 'parent B', refProp: Ref.make(child) }));
    const parentC = db1.add(Obj.make(TaskDoc, { title: 'parent C', refProp: Ref.make(child) }));
    await db1.flush();
    await db1.updateIndexes();

    // The cardinality check a fan-in needs BEFORE it runs: how many objects reference this child?
    const referrersOnPeer1 = await db1.query(Query.select(Filter.id(child.id)).referencedBy(TaskDoc, 'refProp')).run();
    expect(referrersOnPeer1.map((obj) => obj.id).sort()).to.deep.eq([parentA.id, parentB.id, parentC.id].sort());

    // Cross-peer: sync to peer 2 and confirm the same query answers identically there.
    const rootUrl = db1.rootUrl;
    invariant(rootUrl, 'root url');
    await using db2 = await peer2.openDatabase(spaceKey, rootUrl);
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db2.updateIndexes();

    let referrersOnPeer2: TaskDoc[] = [];
    await expect
      .poll(
        async () => {
          referrersOnPeer2 = await db2.query(Query.select(Filter.id(child.id)).referencedBy(TaskDoc, 'refProp')).run();
          return referrersOnPeer2.length;
        },
        { timeout: 10_000 },
      )
      .toBe(3);
    expect(referrersOnPeer2.map((obj) => obj.id).sort()).to.deep.eq([parentA.id, parentB.id, parentC.id].sort());

    // eslint-disable-next-line no-console
    console.log(
      'claim 11: referencedBy(TaskDoc, "refProp") on the shared child ->',
      referrersOnPeer2.length,
      'parents',
    );
  });
});
