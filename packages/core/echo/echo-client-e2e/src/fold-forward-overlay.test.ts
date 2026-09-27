//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Context } from '@dxos/context';
import { DXN, Filter, Lens, Migration, Obj, Type } from '@dxos/echo';
import { EchoTestBuilder, type EchoTestPeer } from '@dxos/echo-client/testing';
import { TestReplicationNetwork, type TestReplicator } from '@dxos/echo-host/testing';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';

import { type TestDatabase, headsOf, writesSince } from './migration-bench/harness.ts';

//
// Fold-forward across a real partition for a `fromLens` migration's OVERLAID target property
// (a target property with no source counterpart, stored in the object's annotation dictionary — see
// `@dxos/echo`'s `internal/lens/overlay.ts`). Sibling of `fold-forward.test.ts`'s `define`-based
// acceptance suite: that one proves the DATA-path detection; this one proves the META-path
// (annotation) detection this task adds, with peer B a genuinely old client that keeps lensing
// through the source type and never registers the migrated-to type.
//

const TaskV1Shape = Schema.Struct({ title: Schema.String });
const TaskV2Shape = Schema.Struct({ title: Schema.String, priority: Schema.optional(Schema.String) });

class TaskV1 extends Type.makeObject<TaskV1>(DXN.make('org.dxos.test.foldForward.e2e.Task', '0.1.0'))(TaskV1Shape) {}
class TaskV2 extends Type.makeObject<TaskV2>(DXN.make('org.dxos.test.foldForward.e2e.Task', '0.2.0'))(TaskV2Shape) {}

/** `priority` has no source counterpart, so the lens stores it as an overlay (`Lens.coverage(lens).overlaid`). */
const taskLens = Lens.make('org.dxos.test.foldForward.e2e.task.lens', TaskV1, TaskV2, {});
const taskMigration = Migration.fromLens(taskLens);

/**
 * Reimplements `fold-forward.test.ts`'s own `createAsymmetricPartitionedPair`: peer B must never
 * register `TaskV2` at all — a genuinely old client, not merely one that has not replicated the type
 * switch yet — so the two peers need independent type lists, which `migration-bench/harness.ts`'s
 * `createPartitionedPair` (one shared list) cannot express.
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
const queryTaskV1ById = async (db: TestDatabase, id: string): Promise<TaskV1> => {
  let found: TaskV1 | undefined;
  await expect
    .poll(async () => {
      [found] = await db.query(Filter.id(id)).run();
      return found;
    })
    .toBeDefined();
  invariant(found, 'expected the replicated object to be queryable');
  return found;
};

describe('fold-forward across a real partition, overlaid property, peer B a genuinely old client', () => {
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

  test('a late overlay write from peer B folds into the promoted property on peer A after heal, and both converge', async () => {
    const [spaceKey] = PublicKey.randomSequence();
    // Peer B never registers `TaskV2` — a genuinely old client, not merely one that has not yet
    // replicated the type switch.
    const pair = await createAsymmetricPartitionedPair(builder, [TaskV1, TaskV2], [TaskV1]);
    network = pair.network;
    const { peer1, peer2, partition, heal, syncAll } = pair;

    await using db1 = await peer1.createDatabase(spaceKey);
    const obj1 = db1.add(Obj.make(TaskV1, { title: 'Write report' }));
    await db1.flush();

    const rootUrl = db1.rootUrl;
    invariant(rootUrl, 'root url');
    await using db2 = await peer2.openDatabase(spaceKey, rootUrl);
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db2.updateIndexes();
    const obj2 = await queryTaskV1ById(db2, obj1.id);

    await partition();

    // Peer A migrates while partitioned; nothing was ever written to the overlay, so nothing is
    // promoted onto `priority`.
    await db1.runMigrations([taskMigration]);
    expect(Obj.getValue(obj1, ['priority'])).to.eq(undefined);

    // Peer B, unaware `TaskV2` even exists, keeps lensing through `taskLens` — its write lands in the
    // object's overlay annotation dictionary (`meta.annotations`), never a data key.
    Lens.put(obj2, taskLens, { priority: 'urgent' });
    await db2.flush();

    await heal();
    await syncAll(db1, db2);
    // Not yet folded: the late write replicated onto the annotation dictionary, `priority` untouched.
    expect(Obj.getValue(obj1, ['priority'])).to.eq(undefined);

    await db1.foldForward([taskMigration]);
    expect(Obj.getValue(obj1, ['priority'])).to.eq('urgent');

    // Converges on peer B too — read via `Obj.getValue`, since peer B never registered `TaskV2` and so
    // cannot resolve a typed `.priority` accessor for it.
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db2.updateIndexes();
    await expect.poll(() => Obj.getValue(obj2, ['priority'])).toBe('urgent');

    // Idempotent: a second pass with nothing new writes nothing further.
    const preSecondPassHeads = headsOf(obj1);
    await db1.foldForward([taskMigration]);
    expect(writesSince(obj1, preSecondPassHeads)).to.deep.eq([]);
  });
});
