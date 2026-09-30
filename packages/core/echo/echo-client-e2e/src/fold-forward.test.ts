//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Context } from '@dxos/context';
import { DXN, Filter, Migration, Obj, Type } from '@dxos/echo';
import { EchoTestBuilder, type EchoTestPeer, getObjectCore } from '@dxos/echo-client/testing';
import { TestReplicationNetwork, type TestReplicator } from '@dxos/echo-host/testing';
import { DATA_NAMESPACE } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { getDeep } from '@dxos/util';

import {
  type TestDatabase,
  changedProps,
  createPartitionedPair,
  diffSince,
  headsOf,
  writesSince,
} from './migration-bench/harness.ts';

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

class TagsV1 extends Type.makeObject<TagsV1>(DXN.make('org.dxos.test.foldForward.e2e.Tags', '0.1.0'))(
  Schema.Struct({ labels: Schema.Array(Schema.String) }),
) {}

class TagsV2 extends Type.makeObject<TagsV2>(DXN.make('org.dxos.test.foldForward.e2e.Tags', '0.2.0'))(
  Schema.Struct({ tags: Schema.Array(Schema.String) }),
) {}

const tagsMigration = Migration.define({
  from: TagsV1,
  to: TagsV2,
  transform: (from) => ({ tags: [...from.labels] }),
});

/** An old client's push onto the retired list, written on the raw document as its replicated change lands. */
const pushLabel = (object: Obj.Unknown, label: string): void => {
  const core = getObjectCore(object);
  core.change((doc) => {
    const labels = getDeep(doc, [...core.mountPath, DATA_NAMESPACE, 'labels']);
    invariant(Array.isArray(labels));
    labels.push(label);
  });
};

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
    // `waitUntilHeadsReplicated` targets each side's heads as captured at call time, so poll until both
    // peers hold both sides' folds.
    await expect
      .poll(async () => {
        await syncAll(db1, db2);
        return headsOf(obj1).join() === headsOf(obj2).join();
      })
      .toBe(true);

    const conflict1 = Obj.getConflict(obj1, 'name');
    const conflict2 = Obj.getConflict(obj2, 'name');
    invariant(conflict1, 'expected peer A to see the conflict after both folds');
    invariant(conflict2, 'expected peer B to see the conflict after both folds');

    // User wins on both peers: the direct `@2` edit is presented, the late `@1` value survives as a
    // fold alternative — never lost, never silently overwritten.
    expect(conflict1.presented).to.eq('Amazing Grace');
    expect(conflict2.presented).to.eq('Amazing Grace');

    // Two alternatives: both peers folded the same late write into one byte-identical change.
    expect(conflict1.alternatives).to.have.length(2);
    const normalize = (conflict: Obj.Conflict) =>
      [...conflict.alternatives].sort((a, b) => a.actor.localeCompare(b.actor));
    expect(normalize(conflict1)).to.deep.eq(normalize(conflict2));
    const folds = conflict1.alternatives.filter((alternative) => alternative.fold);
    const direct = conflict1.alternatives.find((alternative) => !alternative.fold);
    expect(folds).to.have.length(1);
    invariant(direct, 'expected the direct edit among the alternatives');
    expect(folds[0].value).to.eq('Grace Murray Hopper');
    expect(direct.value).to.eq('Amazing Grace');

    // Re-running on both, again independently, performs no further writes — value-compare guards a
    // fold whose recomputed value already matches what is there.
    const preThirdRoundHeads = headsOf(obj1);
    await db1.foldForward([personMigration]);
    await db2.foldForward([personMigration]);
    expect(writesSince(obj1, preThirdRoundHeads)).to.deep.eq([]);
  });
});

describe('fold-forward of list edits across a real partition', () => {
  test('peers that fold the same late inserts at different times insert each one once', async () => {
    const [spaceKey] = PublicKey.randomSequence();
    // Not `await using`: the network must close after the builder.
    const builder = await new EchoTestBuilder().open();
    const pair = await createPartitionedPair(builder, [TagsV1, TagsV2]);
    try {
      const { peer1, peer2, partition, heal, syncAll } = pair;
      await using db1 = await peer1.createDatabase(spaceKey);
      const obj1 = db1.add(Obj.make(TagsV1, { labels: ['a'] }));
      await db1.flush();
      const rootUrl = db1.rootUrl;
      invariant(rootUrl, 'root url');
      await using db2 = await peer2.openDatabase(spaceKey, rootUrl);
      await syncAll(db1, db2);
      let found: TagsV1 | undefined;
      await expect
        .poll(async () => {
          [found] = await db2.query(Filter.id(obj1.id)).run();
          return found;
        })
        .toBeDefined();
      invariant(found, 'expected the replicated object');
      const obj2 = found;

      // Peer A migrates while peer B, still old, inserts a label.
      await partition();
      await db1.runMigrations([tagsMigration]);
      pushLabel(obj2, 'first');
      await db2.flush();
      await heal();
      await expect
        .poll(async () => {
          await syncAll(db1, db2);
          return [Obj.getValue(obj1, ['labels']), Migration.getMigrationSteps(obj2).length];
        })
        .toEqual([['a', 'first'], 1]);

      // Peer A folds the first insert alone; peer B, cut off from that fold, inserts again and folds both.
      await partition();
      await db1.foldForward([tagsMigration]);
      pushLabel(obj2, 'second');
      await db2.flush();
      await db2.foldForward([tagsMigration]);
      await heal();
      await expect
        .poll(async () => {
          await syncAll(db1, db2);
          return headsOf(obj1).join() === headsOf(obj2).join();
        })
        .toBe(true);
      await db1.foldForward([tagsMigration]);

      expect(Obj.getValue(obj1, ['tags'])).to.deep.eq(['a', 'first', 'second']);
      expect(Obj.getValue(obj2, ['tags'])).to.deep.eq(['a', 'first', 'second']);
    } finally {
      await builder.close();
      await pair.network.close();
    }
  });
});

describe('fold-forward when two peers migrate from the same heads', () => {
  test('each peer folds its late insert onto its own migration, and both inserts survive onto the winner', async () => {
    const [spaceKey] = PublicKey.randomSequence();
    // Not `await using`: the network must close after the builder.
    const builder = await new EchoTestBuilder().open();
    const pair = await createPartitionedPair(builder, [TagsV1, TagsV2]);
    try {
      const { peer1, peer2, partition, heal, syncAll } = pair;
      await using db1 = await peer1.createDatabase(spaceKey);
      const obj1 = db1.add(Obj.make(TagsV1, { labels: ['a'] }));
      await db1.flush();
      const rootUrl = db1.rootUrl;
      invariant(rootUrl, 'root url');
      await using db2 = await peer2.openDatabase(spaceKey, rootUrl);
      await syncAll(db1, db2);
      let found: TagsV1 | undefined;
      await expect
        .poll(async () => {
          [found] = await db2.query(Filter.id(obj1.id)).run();
          return found;
        })
        .toBeDefined();
      invariant(found, 'expected the replicated object');
      const obj2 = found;

      // Both peers migrate from the same heads, so each authors its own change for one recorded step.
      await partition();
      await db1.runMigrations([tagsMigration]);
      await db2.runMigrations([tagsMigration]);
      pushLabel(obj1, 'one');
      pushLabel(obj2, 'two');
      await db1.foldForward([tagsMigration]);
      await db2.foldForward([tagsMigration]);

      await heal();
      const converged = async () => {
        await expect
          .poll(async () => {
            await syncAll(db1, db2);
            return headsOf(obj1).join() === headsOf(obj2).join();
          })
          .toBe(true);
      };
      await converged();
      await db1.foldForward([tagsMigration]);
      await db2.foldForward([tagsMigration]);
      await converged();

      expect(Migration.getMigrationSteps(obj1)).to.have.length(1);
      expect(Obj.getValue(obj1, ['tags'])).to.have.members(['a', 'one', 'two']);
      expect(Obj.getValue(obj2, ['tags'])).to.deep.eq(Obj.getValue(obj1, ['tags']));
    } finally {
      await builder.close();
      await pair.network.close();
    }
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

describe('fold-forward e2e: migration steps recorded concurrently', () => {
  test('two peers migrating the same object while partitioned each keep their step', async () => {
    const [spaceKey] = PublicKey.randomSequence();
    // Not `await using`: the network must close after the builder.
    const builder = await new EchoTestBuilder().open();
    const pair = await createPartitionedPair(builder, [PersonV1, PersonV2]);
    try {
      const { peer1, peer2, partition, heal, syncAll } = pair;
      await using db1 = await peer1.createDatabase(spaceKey);
      const person1 = db1.add(Obj.make(PersonV1, { fullName: 'Ada' }));
      await db1.flush();
      const rootUrl = db1.rootUrl;
      invariant(rootUrl, 'root url');
      await using db2 = await peer2.openDatabase(spaceKey, rootUrl);
      await syncAll(db1, db2);
      let person2: PersonV1 | undefined;
      await expect
        .poll(async () => {
          [person2] = await db2.query(Filter.id(person1.id)).run();
          return person2;
        })
        .toBeDefined();
      invariant(person2, 'expected the replicated person');

      await partition();
      // Different pre-migration heads on each side, so the two steps are distinct records.
      Obj.update(person1, (person1) => {
        person1.fullName = 'Ada Lovelace';
      });
      await db1.flush();
      await db1.runMigrations([personMigration]);
      await db2.runMigrations([personMigration]);

      await heal();
      const replicated = person2;
      await expect
        .poll(async () => {
          await syncAll(db1, db2);
          return [Migration.getMigrationSteps(person1).length, Migration.getMigrationSteps(replicated).length];
        })
        .toEqual([2, 2]);
    } finally {
      await builder.close();
      await pair.network.close();
    }
  });
});
