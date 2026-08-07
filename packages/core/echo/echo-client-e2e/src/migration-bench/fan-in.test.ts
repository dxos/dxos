//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { DXN, Filter, Obj, Query, Type } from '@dxos/echo';
import { EchoTestBuilder, getObjectCore } from '@dxos/echo-client/testing';
import { type TestReplicationNetwork } from '@dxos/echo-host/testing';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';

import {
  PersonDoc,
  type TestDatabase,
  changedProps,
  createPartitionedPair,
  diffSince,
  foldInto,
  headsOf,
  recordConflict,
  writesSince,
} from './harness';

//
// E3: definitive proof (or disproof) that fan-in (N children -> 1 parent absorption) is "fine" per
// expectation E3 ONLY when qualified: a deterministic removal choice, a DECLARED property-collision
// resolution, and a query-based path for children created after the fan-in "completed". See
// `.agents/projects/lenses/DESIGN.md` §10.3.
//

/** Local fan-in child type: `ownerId` back-references the absorbing `PersonDoc`; kept local since `harness.ts` is frozen. */
class AddressDoc extends Type.makeObject<AddressDoc>(
  DXN.make('org.dxos.test.migration.bench.fanin.AddressDoc', '0.1.0'),
)(
  Schema.Struct({
    street: Schema.optional(Schema.String),
    ownerId: Schema.optional(Schema.String),
  }),
) {}

/**
 * Cross-peer visibility isn't guaranteed the instant `waitUntilHeadsReplicated`/`updateIndexes`
 * resolve, so poll for the replicated object rather than reading the query result once.
 */
const queryPersonById = async (db: TestDatabase, id: string): Promise<PersonDoc> => {
  let found: PersonDoc | undefined;
  await expect
    .poll(async () => {
      [found] = await db.query(Filter.id(id)).run();
      return found;
    })
    .toBeDefined();
  invariant(found, 'expected the replicated object to be queryable');
  return found;
};

const queryAddressById = async (db: TestDatabase, id: string): Promise<AddressDoc> => {
  let found: AddressDoc | undefined;
  await expect
    .poll(async () => {
      [found] = await db.query(Filter.id(id)).run();
      return found;
    })
    .toBeDefined();
  invariant(found, 'expected the replicated object to be queryable');
  return found;
};

/** Every non-tombstoned `AddressDoc` whose `ownerId` points at `parentId` — the query-based path E3d needs. */
const queryLiveChildrenOf = async (db: TestDatabase, parentId: string): Promise<AddressDoc[]> =>
  db.query(Query.select(Filter.type(AddressDoc, { ownerId: parentId }))).run();

const queryTombstonedById = async (db: TestDatabase, id: string): Promise<AddressDoc> => {
  let found: AddressDoc | undefined;
  await expect
    .poll(async () => {
      found = (await db.query(Query.select(Filter.type(AddressDoc)).options({ deleted: 'include' })).run()).find(
        (obj) => obj.id === id,
      );
      return found;
    })
    .toBeDefined();
  invariant(found, 'expected the tombstoned child to remain queryable with deleted: include');
  return found;
};

/**
 * The declared fan-in resolution under test: sort candidates by id (min wins — deterministic since
 * ids are already synced identically to every peer before this runs), fold the winner's `street`
 * into `parent.employerName`, record a displacement conflict for every loser, then tombstone every
 * candidate — `isDeleted`-guarded so a second call on an already-absorbed child performs zero writes.
 */
const absorbChildren = (db: TestDatabase, parent: PersonDoc, children: readonly AddressDoc[]): void => {
  if (children.length === 0) {
    return;
  }
  const [winner, ...losers] = [...children].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  Obj.update(parent, (parent) => {
    foldInto(parent, 'employerName', winner.street ?? '');
    for (const loser of losers) {
      recordConflict(parent, 'employerName', winner.street ?? '', loser.street ?? '', loser.id);
    }
  });
  for (const child of children) {
    if (!getObjectCore(child).isDeleted()) {
      db.remove(child);
    }
  }
};

describe('E3: fan-in (N→1 absorption)', () => {
  let builder: EchoTestBuilder;
  let network: TestReplicationNetwork | undefined;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    // Peers must close before the network so replicator teardown runs against a live network —
    // and this ordering must hold on the assertion-failure path too, which an in-test
    // `await using network` cannot guarantee.
    await builder.close();
    await network?.close();
    network = undefined;
  });

  test('E3a: deterministic absorption converges, tombstones the child, and re-running performs zero writes', async ({
    expect,
  }) => {
    const [spaceKey] = PublicKey.randomSequence();
    const pair = await createPartitionedPair(builder, [PersonDoc, AddressDoc]);
    network = pair.network;
    const { peer1, peer2, partition, heal, syncAll } = pair;

    await using db1 = await peer1.createDatabase(spaceKey);
    const parent1 = db1.add(Obj.make(PersonDoc, {}));
    const child1 = db1.add(Obj.make(AddressDoc, { street: '123 Main St', ownerId: parent1.id }));
    await db1.flush();

    const rootUrl = db1.rootUrl;
    invariant(rootUrl, 'root url');
    await using db2 = await peer2.openDatabase(spaceKey, rootUrl);
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db2.updateIndexes();
    const parent2 = await queryPersonById(db2, parent1.id);
    const child2 = await queryAddressById(db2, child1.id);

    await partition();

    // Both peers run the IDENTICAL fold over the SAME synced input — deterministic by construction:
    // the child itself is "the object being removed", chosen by there being exactly one.
    absorbChildren(db1, parent1, [child1]);
    absorbChildren(db2, parent2, [child2]);
    await db1.flush();
    await db2.flush();

    await heal();
    await syncAll(db1, db2);

    await expect.poll(() => parent1.employerName).toBe('123 Main St');
    await expect.poll(() => parent2.employerName).toBe('123 Main St');
    expect(parent1.employerName).to.eq(parent2.employerName);

    expect(getObjectCore(child1).isDeleted()).to.eq(true);
    // `child2` is peer 2's own proxy — poll for the tombstone to cross the wire rather than reading
    // it synchronously right after sync.
    await expect.poll(() => getObjectCore(child2).isDeleted()).toBe(true);

    // Default queries exclude the tombstoned child on both peers.
    await expect
      .poll(async () =>
        (await db1.query(Query.select(Filter.type(AddressDoc))).run()).some((obj) => obj.id === child1.id),
      )
      .toBe(false);
    await expect
      .poll(async () =>
        (await db2.query(Query.select(Filter.type(AddressDoc))).run()).some((obj) => obj.id === child2.id),
      )
      .toBe(false);

    // `deleted: 'include'` still reads it, street value intact beneath the tombstone.
    const deletedOnPeer1 = await queryTombstonedById(db1, child1.id);
    const deletedOnPeer2 = await queryTombstonedById(db2, child2.id);
    expect(deletedOnPeer1.street).to.eq('123 Main St');
    expect(deletedOnPeer2.street).to.eq('123 Main St');

    // Re-running the SAME absorption is idempotent: the guarded fold and the isDeleted-guarded
    // tombstone both skip, so zero new patches land on either object.
    const postFoldParentHeads = headsOf(parent1);
    const postFoldChildHeads = headsOf(child1);
    absorbChildren(db1, parent1, [child1]);
    await db1.flush();
    expect(writesSince(parent1, postFoldParentHeads)).to.deep.eq([]);
    expect(writesSince(child1, postFoldChildHeads)).to.deep.eq([]);
  });

  test('E3b: a property collision needs a DECLARED resolution, not just deterministic removal', async ({ expect }) => {
    const [spaceKey] = PublicKey.randomSequence();
    const pair = await createPartitionedPair(builder, [PersonDoc, AddressDoc]);
    network = pair.network;
    const { peer1, peer2, partition, heal, syncAll } = pair;

    await using db1 = await peer1.createDatabase(spaceKey);
    const parentDeclared1 = db1.add(Obj.make(PersonDoc, {}));
    const childA1 = db1.add(Obj.make(AddressDoc, { street: 'Alpha St', ownerId: parentDeclared1.id }));
    const childB1 = db1.add(Obj.make(AddressDoc, { street: 'Beta St', ownerId: parentDeclared1.id }));
    const parentUndeclared1 = db1.add(Obj.make(PersonDoc, {}));
    const childC1 = db1.add(Obj.make(AddressDoc, { street: 'Gamma St', ownerId: parentUndeclared1.id }));
    const childD1 = db1.add(Obj.make(AddressDoc, { street: 'Delta St', ownerId: parentUndeclared1.id }));
    await db1.flush();

    const rootUrl = db1.rootUrl;
    invariant(rootUrl, 'root url');
    await using db2 = await peer2.openDatabase(spaceKey, rootUrl);
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db2.updateIndexes();
    const parentDeclared2 = await queryPersonById(db2, parentDeclared1.id);
    const childA2 = await queryAddressById(db2, childA1.id);
    const childB2 = await queryAddressById(db2, childB1.id);
    const parentUndeclared2 = await queryPersonById(db2, parentUndeclared1.id);
    const childC2 = await queryAddressById(db2, childC1.id);
    const childD2 = await queryAddressById(db2, childD1.id);

    // The child ids are already synced identically to both peers, so sorting by id here predicts the
    // SAME winner `absorbChildren` will pick on either side — this is the declared resolution itself.
    const [expectedWinner, expectedLoser] = childA1.id < childB1.id ? [childA1, childB1] : [childB1, childA1];

    await partition();

    // (i) Declared resolution: both peers independently sort by id and absorb both children.
    absorbChildren(db1, parentDeclared1, [childA1, childB1]);
    absorbChildren(db2, parentDeclared2, [childA2, childB2]);

    // (ii) NO declared resolution: each peer folds a DIFFERENT child's value directly into the SAME
    // property, concurrently — the property-level collision a deterministic removal choice alone
    // does not cover.
    Obj.update(parentUndeclared1, (parentUndeclared1) => {
      foldInto(parentUndeclared1, 'employerName', childC1.street ?? '');
    });
    Obj.update(parentUndeclared2, (parentUndeclared2) => {
      foldInto(parentUndeclared2, 'employerName', childD2.street ?? '');
    });

    await db1.flush();
    await db2.flush();
    await heal();
    await syncAll(db1, db2);

    // (i): both peers converge on the min-id child's value; the loser child survives, tombstoned but
    // intact, and the displacement is recorded — identically on both peers.
    await expect.poll(() => parentDeclared1.employerName).toBe(expectedWinner.street);
    await expect.poll(() => parentDeclared2.employerName).toBe(expectedWinner.street);
    expect(parentDeclared1.conflicts?.employerName).to.deep.eq({
      mine: expectedWinner.street,
      theirs: expectedLoser.street,
      loserId: expectedLoser.id,
    });
    expect(parentDeclared2.conflicts?.employerName).to.deep.eq(parentDeclared1.conflicts?.employerName);

    expect(getObjectCore(childA1).isDeleted()).to.eq(true);
    expect(getObjectCore(childB1).isDeleted()).to.eq(true);
    const loserOnPeer1 = await queryTombstonedById(db1, expectedLoser.id);
    expect(loserOnPeer1.street).to.eq(expectedLoser.street);

    // (ii): the register converges (a pure function of the merged op-set — claim 10's finding), but
    // WHICH value wins is actor-id-randomized per prior research; asserting a specific winner here
    // would flake, which is exactly why the resolution must be declared instead of left to LWW.
    await expect
      .poll(
        () =>
          parentUndeclared1.employerName !== undefined &&
          parentUndeclared1.employerName === parentUndeclared2.employerName,
      )
      .toBe(true);
    expect(['Gamma St', 'Delta St']).to.include(parentUndeclared1.employerName);
  });

  test('E3c: a late write to an absorbed (tombstoned) child folds into the parent', async ({ expect }) => {
    const [spaceKey] = PublicKey.randomSequence();
    const pair = await createPartitionedPair(builder, [PersonDoc, AddressDoc]);
    network = pair.network;
    const { peer1, peer2, partition, heal, syncAll } = pair;

    await using db1 = await peer1.createDatabase(spaceKey);
    const parentClean1 = db1.add(Obj.make(PersonDoc, {}));
    const childClean1 = db1.add(Obj.make(AddressDoc, { street: 'original street', ownerId: parentClean1.id }));
    const parentConflict1 = db1.add(Obj.make(PersonDoc, {}));
    const childConflict1 = db1.add(Obj.make(AddressDoc, { street: 'original street', ownerId: parentConflict1.id }));
    await db1.flush();

    const rootUrl = db1.rootUrl;
    invariant(rootUrl, 'root url');
    await using db2 = await peer2.openDatabase(spaceKey, rootUrl);
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db2.updateIndexes();
    const parentClean2 = await queryPersonById(db2, parentClean1.id);
    const childClean2 = await queryAddressById(db2, childClean1.id);
    const parentConflict2 = await queryPersonById(db2, parentConflict1.id);
    const childConflict2 = await queryAddressById(db2, childConflict1.id);

    // Peer 1 absorbs + tombstones both children while still connected — the fan-in "completing".
    absorbChildren(db1, parentClean1, [childClean1]);
    absorbChildren(db1, parentConflict1, [childConflict1]);
    await db1.flush();
    const postAbsorbConflictHeads = headsOf(parentConflict1);

    await syncAll(db1, db2);
    await expect.poll(() => parentClean2.employerName).toBe('original street');
    await expect.poll(() => parentConflict2.employerName).toBe('original street');

    await partition();

    // Peer 2, old-schema, still holds a live proxy to the (now tombstoned) child and keeps editing
    // it — tombstoning is app-level, so it does not stop a stale client from writing the field.
    Obj.update(childClean2, (childClean2) => {
      childClean2.street = 'late street';
    });
    Obj.update(childConflict2, (childConflict2) => {
      childConflict2.street = 'late street conflict';
    });
    await db2.flush();

    // Peer 1 directly edits the CONFLICT parent's absorbed property, concurrently with peer 2's late
    // child write — a genuine clash between a direct edit and a late fold source.
    Obj.update(parentConflict1, (parentConflict1) => {
      parentConflict1.employerName = 'direct edit';
    });
    await db1.flush();

    await heal();
    await syncAll(db1, db2);

    await expect.poll(() => childClean1.street).toBe('late street');
    await expect.poll(() => childConflict1.street).toBe('late street conflict');

    const tombstonedCleanChild1 = await queryTombstonedById(db1, childClean1.id);
    const tombstonedConflictChild1 = await queryTombstonedById(db1, childConflict1.id);
    expect(getObjectCore(tombstonedCleanChild1).isDeleted()).to.eq(true);
    expect(getObjectCore(tombstonedConflictChild1).isDeleted()).to.eq(true);

    // Clean path: the late value differs from the recorded absorption baseline and nothing directly
    // edited the parent property since absorption, so it folds straight through.
    const absorbedBaselineClean = 'original street';
    Obj.update(parentClean1, (parentClean1) => {
      if (tombstonedCleanChild1.street !== absorbedBaselineClean) {
        foldInto(parentClean1, 'employerName', tombstonedCleanChild1.street ?? '');
      }
    });

    // Conflict path: the parent property WAS directly edited since absorption — record the conflict
    // instead of clobbering the direct edit with the late fold value.
    const directlyEdited = changedProps(diffSince(parentConflict1, postAbsorbConflictHeads), new Set(['employerName']));
    Obj.update(parentConflict1, (parentConflict1) => {
      if (directlyEdited.has('employerName')) {
        recordConflict(
          parentConflict1,
          'employerName',
          parentConflict1.employerName ?? '',
          tombstonedConflictChild1.street ?? '',
        );
      } else {
        foldInto(parentConflict1, 'employerName', tombstonedConflictChild1.street ?? '');
      }
    });
    await db1.flush();

    expect(parentClean1.employerName).to.eq('late street');
    expect(parentConflict1.employerName).to.eq('direct edit'); // winner not clobbered.
    expect(parentConflict1.conflicts?.employerName).to.deep.eq({ mine: 'direct edit', theirs: 'late street conflict' });

    await syncAll(db1, db2);
    await expect.poll(() => parentClean2.employerName).toBe('late street');
    await expect.poll(() => parentConflict2.conflicts?.employerName).toBeDefined();
    expect(parentConflict2.conflicts?.employerName).to.deep.eq({ mine: 'direct edit', theirs: 'late street conflict' });
    expect(parentConflict2.employerName).to.eq('direct edit');

    // The late write never resurrects either child — both stay tombstoned throughout.
    expect(getObjectCore(childClean1).isDeleted()).to.eq(true);
    expect(getObjectCore(childConflict1).isDeleted()).to.eq(true);
  });

  test('E3d: a late-created child after fan-in "completed" is found by query, absorbed, and re-detection converges to empty', async ({
    expect,
  }) => {
    const [spaceKey] = PublicKey.randomSequence();
    const pair = await createPartitionedPair(builder, [PersonDoc, AddressDoc]);
    network = pair.network;
    const { peer1, peer2, partition, heal, syncAll } = pair;

    await using db1 = await peer1.createDatabase(spaceKey);
    const parent1 = db1.add(Obj.make(PersonDoc, {}));
    await db1.flush();

    const rootUrl = db1.rootUrl;
    invariant(rootUrl, 'root url');
    await using db2 = await peer2.openDatabase(spaceKey, rootUrl);
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db2.updateIndexes();
    const parent2 = await queryPersonById(db2, parent1.id);

    // Fan-in "complete": no children exist yet, so the detection query starts empty on both peers.
    expect(await queryLiveChildrenOf(db1, parent1.id)).to.deep.eq([]);
    expect(await queryLiveChildrenOf(db2, parent2.id)).to.deep.eq([]);

    await partition();

    // Peer 2, old-schema, creates a brand-new child for a parent it believes is still un-migrated.
    const lateChild2 = db2.add(Obj.make(AddressDoc, { street: 'late child street', ownerId: parent2.id }));
    await db2.flush();

    await heal();
    await syncAll(db1, db2);

    // Detect it on peer 1 by QUERY, not heads — a brand-new automerge doc has no stored migration
    // heads to diff against, so the children-of-parent query is the only signal available (claim 12).
    let lateCandidates1: AddressDoc[] = [];
    await expect
      .poll(async () => {
        lateCandidates1 = await queryLiveChildrenOf(db1, parent1.id);
        return lateCandidates1.length;
      })
      .toBe(1);
    expect(lateCandidates1[0].id).to.eq(lateChild2.id);

    // Absorb with the SAME declared resolution as E3b — trivial here since there is only one
    // candidate, so it wins outright with no conflict recorded.
    absorbChildren(db1, parent1, lateCandidates1);
    await db1.flush();

    await syncAll(db1, db2);
    await expect.poll(() => parent1.employerName).toBe('late child street');
    await expect.poll(() => parent2.employerName).toBe('late child street');
    // `lateChild2` is peer 2's own proxy for the object peer 1 just tombstoned — poll rather than
    // read synchronously right after sync, since cross-peer merge visibility is not instantaneous.
    await expect.poll(() => getObjectCore(lateChild2).isDeleted()).toBe(true);

    // Re-detection finds nothing: the query-based path converges to empty once absorbed.
    expect(await queryLiveChildrenOf(db1, parent1.id)).to.deep.eq([]);
    await expect.poll(async () => (await queryLiveChildrenOf(db2, parent2.id)).length).toBe(0);

    // Second round: another late child is created, then BOTH peers repeat detection+absorption
    // independently, proving the query-based path is not a one-off fluke.
    await partition();
    const lateChild2Round2 = db2.add(Obj.make(AddressDoc, { street: 'late street round 2', ownerId: parent2.id }));
    await db2.flush();
    await heal();
    await syncAll(db1, db2);

    await expect.poll(async () => (await queryLiveChildrenOf(db1, parent1.id)).length).toBe(1);

    // Partition again so each peer's detect+absorb is provably independent, not reliant on live sync.
    await partition();
    const candidates1Round2 = await queryLiveChildrenOf(db1, parent1.id);
    const candidates2Round2 = await queryLiveChildrenOf(db2, parent2.id);
    absorbChildren(db1, parent1, candidates1Round2);
    absorbChildren(db2, parent2, candidates2Round2);
    await db1.flush();
    await db2.flush();

    await heal();
    await syncAll(db1, db2);

    await expect.poll(() => parent1.employerName).toBe('late street round 2');
    await expect.poll(() => parent2.employerName).toBe('late street round 2');
    expect(getObjectCore(lateChild2Round2).isDeleted()).to.eq(true);

    expect(await queryLiveChildrenOf(db1, parent1.id)).to.deep.eq([]);
    expect(await queryLiveChildrenOf(db2, parent2.id)).to.deep.eq([]);
  });
});
