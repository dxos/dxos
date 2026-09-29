//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Context } from '@dxos/context';
import { DXN, Filter, Migration, Obj, Type } from '@dxos/echo';
import { EchoTestBuilder, type EchoTestPeer } from '@dxos/echo-client/testing';
import { TestReplicationNetwork, type TestReplicator } from '@dxos/echo-host/testing';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';

import { type TestDatabase, changedProps, diffSince, headsOf, writesSince } from './migration-bench/harness.ts';

//
// Fold-forward acceptance (Phase C2/C3, `.agents/projects/lenses/IMPLEMENTATION-PLAN.md` Phase C):
// the client-side unit suite (`@dxos/echo-client`'s `src/proxy-db/fold-forward.test.ts`) proves the
// mechanism on a single db; this proves it across a real partition, with peer B a genuinely OLD
// client that never even registers the migrated-to type — the case `runMigrations`'s own type-switch
// cannot paper over, since peer B's writes replicate as ordinary data regardless of what it has
// registered locally.
//

const PersonV1Shape = Schema.Struct({ fullName: Schema.String });
const PersonV2Shape = Schema.Struct({ name: Schema.String });

class PersonV1 extends Type.makeObject<PersonV1>(DXN.make('org.dxos.test.foldForward.e2e.Person', '0.1.0'))(
  PersonV1Shape,
) {}

class PersonV2 extends Type.makeObject<PersonV2>(DXN.make('org.dxos.test.foldForward.e2e.Person', '0.2.0'))(
  PersonV2Shape,
) {}

const personMigration = Migration.define({
  from: PersonV1,
  to: PersonV2,
  transform: (from) => ({ name: from.fullName }),
});

// A second `@2 -> @3` hop for the chained-migration variant below: peer A knows the whole chain, peer B
// is stuck at `@1` and never even learns `@2` exists, let alone `@3`.
const ChainPersonV3Shape = Schema.Struct({ displayName: Schema.String });

class ChainPersonV1 extends Type.makeObject<ChainPersonV1>(
  DXN.make('org.dxos.test.foldForward.e2e.chain.Person', '0.1.0'),
)(PersonV1Shape) {}

class ChainPersonV2 extends Type.makeObject<ChainPersonV2>(
  DXN.make('org.dxos.test.foldForward.e2e.chain.Person', '0.2.0'),
)(PersonV2Shape) {}

class ChainPersonV3 extends Type.makeObject<ChainPersonV3>(
  DXN.make('org.dxos.test.foldForward.e2e.chain.Person', '0.3.0'),
)(ChainPersonV3Shape) {}

const chainMigration12 = Migration.define({
  from: ChainPersonV1,
  to: ChainPersonV2,
  transform: (from) => ({ name: from.fullName }),
});

const chainMigration23 = Migration.define({
  from: ChainPersonV2,
  to: ChainPersonV3,
  transform: (from) => ({ displayName: from.name }),
});

/**
 * `createPartitionedPair` (`migration-bench/harness.ts`) registers the SAME types on both peers — not
 * suited here, where peer B must never register `PersonV2` at all (a genuinely old client, not merely
 * one that has not replicated the type switch yet). Reimplements the same transport-level
 * partition/heal choreography with per-peer type lists, as `migration-bench/validation.test.ts`'s own
 * `createAsymmetricPartitionedPair` does.
 */
const createAsymmetricPartitionedPair = async (
  builder: EchoTestBuilder,
  peer1Types: Type.AnyEntity[],
  peer2Types: Type.AnyEntity[],
): Promise<{
  network: TestReplicationNetwork;
  peer1: EchoTestPeer;
  peer2: EchoTestPeer;
  partition: () => Promise<void>;
  heal: () => Promise<void>;
  syncAll: (db1: TestDatabase, db2: TestDatabase) => Promise<void>;
}> => {
  const network = await new TestReplicationNetwork().open();
  const peer1 = await builder.createPeer({ types: peer1Types });
  const peer2 = await builder.createPeer({ types: peer2Types });

  let replicator1: TestReplicator = await network.createReplicator();
  let replicator2: TestReplicator = await network.createReplicator();
  await peer1.host.addReplicator(Context.default(), replicator1);
  await peer2.host.addReplicator(Context.default(), replicator2);

  const partition = async (): Promise<void> => {
    await peer1.host.removeReplicator(replicator1);
    await peer2.host.removeReplicator(replicator2);
  };

  const heal = async (): Promise<void> => {
    replicator1 = await network.createReplicator();
    replicator2 = await network.createReplicator();
    await peer1.host.addReplicator(Context.default(), replicator1);
    await peer2.host.addReplicator(Context.default(), replicator2);
  };

  const syncAll = async (db1: TestDatabase, db2: TestDatabase): Promise<void> => {
    await db1.waitUntilHeadsReplicated(await db2.getDocumentHeads());
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db1.updateIndexes();
    await db2.updateIndexes();
  };

  return { network, peer1, peer2, partition, heal, syncAll };
};

/**
 * Cross-peer visibility isn't guaranteed the instant `waitUntilHeadsReplicated`/`updateIndexes`
 * resolve, so poll for the replicated object rather than reading the query result once.
 */
const queryPersonV1ById = async (db: TestDatabase, id: string): Promise<PersonV1> => {
  let found: PersonV1 | undefined;
  await expect
    .poll(async () => {
      [found] = await db.query(Filter.id(id)).run();
      return found;
    })
    .toBeDefined();
  invariant(found, 'expected the replicated object to be queryable');
  return found;
};

describe('fold-forward across a real partition, peer B a genuinely old client', () => {
  let builder: EchoTestBuilder;
  let network: TestReplicationNetwork | undefined;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
    await network?.close();
    network = undefined;
  });

  test('a late `@1` write from peer B folds into `@2` on peer A after heal, and both converge', async () => {
    const [spaceKey] = PublicKey.randomSequence();
    // Peer B never registers `PersonV2` — a genuinely old client, not merely one that has not yet
    // replicated the type switch.
    const pair = await createAsymmetricPartitionedPair(builder, [PersonV1, PersonV2], [PersonV1]);
    network = pair.network;
    const { peer1, peer2, partition, heal, syncAll } = pair;

    await using db1 = await peer1.createDatabase(spaceKey);
    const obj1 = db1.add(Obj.make(PersonV1, { fullName: 'Ada Lovelace' }));
    await db1.flush();

    const rootUrl = db1.rootUrl;
    invariant(rootUrl, 'root url');
    await using db2 = await peer2.openDatabase(spaceKey, rootUrl);
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db2.updateIndexes();
    const obj2 = await queryPersonV1ById(db2, obj1.id);

    await partition();

    // Peer A migrates while partitioned.
    await db1.runMigrations([personMigration]);
    expect(Obj.getValue(obj1, ['name'])).to.eq('Ada Lovelace');

    // Peer B, unaware `PersonV2` even exists, keeps writing the only shape it knows.
    Obj.update(obj2, (obj2) => {
      obj2.fullName = 'Augusta Ada King';
    });
    await db2.flush();

    await heal();
    await syncAll(db1, db2);
    await expect.poll(() => Obj.getValue(obj1, ['fullName'])).toBe('Augusta Ada King');
    // Not yet folded: the late write replicated onto the retired property, `name` is untouched.
    expect(Obj.getValue(obj1, ['name'])).to.eq('Ada Lovelace');

    await db1.foldForward([personMigration]);
    expect(Obj.getValue(obj1, ['name'])).to.eq('Augusta Ada King');

    // Converges on peer B too — read via `Obj.getValue`, since peer B never registered `PersonV2` and
    // so cannot resolve a typed `.name` accessor for it.
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db2.updateIndexes();
    await expect.poll(() => Obj.getValue(obj2, ['name'])).toBe('Augusta Ada King');

    // Idempotent: a second pass with nothing new writes nothing further.
    const preSecondPassHeads = headsOf(obj1);
    await db1.foldForward([personMigration]);
    expect(writesSince(obj1, preSecondPassHeads)).to.deep.eq([]);
  });

  test('folding forward on both peers independently converges to the same conflict', async () => {
    const [spaceKey] = PublicKey.randomSequence();
    const pair = await createAsymmetricPartitionedPair(builder, [PersonV1, PersonV2], [PersonV1]);
    network = pair.network;
    const { peer1, peer2, partition, heal, syncAll } = pair;

    await using db1 = await peer1.createDatabase(spaceKey);
    const obj1 = db1.add(Obj.make(PersonV1, { fullName: 'Grace Hopper' }));
    await db1.flush();

    const rootUrl = db1.rootUrl;
    invariant(rootUrl, 'root url');
    await using db2 = await peer2.openDatabase(spaceKey, rootUrl);
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db2.updateIndexes();
    const obj2 = await queryPersonV1ById(db2, obj1.id);

    await db1.runMigrations([personMigration]);
    await syncAll(db1, db2);
    await expect.poll(() => Obj.getValue(obj2, ['name'])).toBe('Grace Hopper');

    await partition();

    // A direct `@2` edit on peer A, concurrent (in CRDT terms — the fold re-keys into the migration's
    // own heads) with peer B's late `@1` write to the retired property.
    Obj.update(obj1, (obj1) => {
      Obj.setValue(obj1, ['name'], 'Amazing Grace');
    });
    await db1.flush();

    Obj.update(obj2, (obj2) => {
      obj2.fullName = 'Grace Murray Hopper';
    });
    await db2.flush();

    await heal();
    await syncAll(db1, db2);
    await expect.poll(() => Obj.getValue(obj1, ['fullName'])).toBe('Grace Murray Hopper');
    const lateSourceProps = changedProps(diffSince(obj1, headsOf(obj1)), new Set(['fullName']));
    expect([...lateSourceProps]).to.deep.eq([]); // nothing NEW since the last read — sanity only.

    // Both peers fold independently — genuinely so: partitioned again first, so neither peer's
    // checkpoint write can race the other's fold over the still-live connection (which would make the
    // second peer see nothing left to fold and collapse this to a two-alternative conflict instead).
    await partition();
    await db1.foldForward([personMigration]);
    await db2.foldForward([personMigration]);
    await heal();
    // Two independent concurrent forks (one per peer, both off `postMigrationHeads`) can take more
    // than one `syncAll` round to fully reconcile both ways: `waitUntilHeadsReplicated` targets each
    // side's heads as captured at call time, which is stale the instant the OTHER side's own fold is
    // still in flight — polling (as every cross-peer read in this suite does) rather than a fixed
    // round count is what actually waits for both peers to see all three alternatives.
    await expect
      .poll(async () => {
        await syncAll(db1, db2);
        return [Obj.getConflict(obj1, 'name')?.alternatives.length, Obj.getConflict(obj2, 'name')?.alternatives.length];
      })
      .toEqual([3, 3]);

    const conflict1 = Obj.getConflict(obj1, 'name');
    const conflict2 = Obj.getConflict(obj2, 'name');
    invariant(conflict1, 'expected peer A to see the conflict after both folds');
    invariant(conflict2, 'expected peer B to see the conflict after both folds');

    // User wins on both peers: the direct `@2` edit is presented, the late `@1` value survives as a
    // fold alternative — never lost, never silently overwritten.
    expect(conflict1.presented).to.eq('Amazing Grace');
    expect(conflict2.presented).to.eq('Amazing Grace');

    // Three alternatives, not two: each peer folds under its own derived actor, so peer A's and peer
    // B's folds are distinct changes carrying the same value, kept beside the one direct edit.
    expect(conflict1.alternatives).to.have.length(3);
    const normalize = (conflict: Obj.Conflict) =>
      [...conflict.alternatives].sort((a, b) => a.actor.localeCompare(b.actor));
    expect(normalize(conflict1)).to.deep.eq(normalize(conflict2));
    const folds = conflict1.alternatives.filter((alternative) => alternative.fold);
    const direct = conflict1.alternatives.find((alternative) => !alternative.fold);
    expect(folds).to.have.length(2);
    invariant(direct, 'expected the direct edit among the alternatives');
    expect(folds.every((fold) => fold.value === 'Grace Murray Hopper')).to.eq(true);
    expect(new Set(folds.map((fold) => fold.actor)).size).to.eq(2); // two distinct actors, one per peer.
    expect(direct.value).to.eq('Amazing Grace');

    // Re-running on both, again independently, performs no further writes — value-compare guards a
    // fold whose recomputed value already matches what is there.
    const preThirdRoundHeads = headsOf(obj1);
    await db1.foldForward([personMigration]);
    await db2.foldForward([personMigration]);
    expect(writesSince(obj1, preThirdRoundHeads)).to.deep.eq([]);
  });
});

describe('fold-forward chained migrations across a real partition, peer B stuck at @1', () => {
  let builder: EchoTestBuilder;
  let network: TestReplicationNetwork | undefined;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
    await network?.close();
    network = undefined;
  });

  test('a late `@1` write from peer B folds all the way to `@3` on peer A after heal', async () => {
    const [spaceKey] = PublicKey.randomSequence();
    // Peer A knows the whole chain; peer B never registers `@2` or `@3` — a genuinely old client, not
    // merely one that has not yet replicated the type switches.
    const pair = await createAsymmetricPartitionedPair(
      builder,
      [ChainPersonV1, ChainPersonV2, ChainPersonV3],
      [ChainPersonV1],
    );
    network = pair.network;
    const { peer1, peer2, partition, heal, syncAll } = pair;

    await using db1 = await peer1.createDatabase(spaceKey);
    const obj1 = db1.add(Obj.make(ChainPersonV1, { fullName: 'Ada Lovelace' }));
    await db1.flush();

    const rootUrl = db1.rootUrl;
    invariant(rootUrl, 'root url');
    await using db2 = await peer2.openDatabase(spaceKey, rootUrl);
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db2.updateIndexes();
    let found: ChainPersonV1 | undefined;
    await expect
      .poll(async () => {
        [found] = await db2.query(Filter.id(obj1.id)).run();
        return found;
      })
      .toBeDefined();
    invariant(found, 'expected the replicated object to be queryable');
    const obj2 = found;

    await partition();

    // Peer A runs BOTH migrations while partitioned — the object ends up `@3`-typed on peer A's side.
    await db1.runMigrations([chainMigration12, chainMigration23]);
    expect(Obj.getValue(obj1, ['displayName'])).to.eq('Ada Lovelace');

    // Peer B, unaware `@2` or `@3` even exist, keeps writing the only shape it knows.
    Obj.update(obj2, (obj2) => {
      obj2.fullName = 'Augusta Ada King';
    });
    await db2.flush();

    await heal();
    await syncAll(db1, db2);
    await expect.poll(() => Obj.getValue(obj1, ['fullName'])).toBe('Augusta Ada King');
    // Not yet folded: the late write replicated onto the retired `@1` property, `displayName` untouched.
    expect(Obj.getValue(obj1, ['displayName'])).to.eq('Ada Lovelace');

    await db1.foldForward([chainMigration12, chainMigration23]);
    expect(Obj.getValue(obj1, ['displayName'])).to.eq('Augusta Ada King');

    // Idempotent: a second pass with nothing new writes nothing further.
    const preSecondPassHeads = headsOf(obj1);
    await db1.foldForward([chainMigration12, chainMigration23]);
    expect(writesSince(obj1, preSecondPassHeads)).to.deep.eq([]);
  });
});
