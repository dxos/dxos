//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { waitForCondition } from '@dxos/async';
import { Context } from '@dxos/context';
import { Filter, Merge, Obj, Query } from '@dxos/echo';
import { TestReplicationNetwork } from '@dxos/echo-host/testing';
import { TestSchema } from '@dxos/echo/testing';
import { PublicKey } from '@dxos/keys';

import { EchoTestBuilder } from '../testing';
import { foldLateEdits, mergeDuplicates, resolveMerged } from './merge-executor';

// The scenario the whole design exists for: peers initialize the same application state without
// coordinating, so each mints its own object and replication surfaces the duplicates.
describe('merge convergence', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  const seed = (db: any, title: string) => {
    const task = db.add(Obj.make(TestSchema.Task, { title }));
    Merge.setNaturalKey(task, 'org.example.seed');
    return task;
  };

  const liveTasks = (db: any) => db.query(Filter.type(TestSchema.Task)).run();

  // Merged-away losers are tombstoned, so following a redirect needs the deleted ones too.
  const allTasks = (db: any) =>
    db.query(Query.select(Filter.type(TestSchema.Task)).options({ deleted: 'include' })).run();

  // `waitUntilHeadsReplicated` covers document replication, but queries read through the index,
  // which settles a tick later. A live query collapses duplicates on sight, so the barrier has to
  // wait on the tombstone-inclusive view — which is also the only way to observe the pre-merge
  // pair at all.
  const waitForAllTasks = (db: any, count: number) =>
    waitForCondition({
      condition: async () => (await allTasks(db)).length === count,
      timeout: 5_000,
    });

  // The worker merges asynchronously off the indexing stream, so convergence is awaited: exactly
  // one live task, and it is the expected winner.
  const waitForLiveWinner = (db: any, winner: string) =>
    waitForCondition({
      condition: async () => {
        const live = await liveTasks(db);
        return live.length === 1 && live[0].id === winner;
      },
      timeout: 10_000,
    });

  test('two peers seeding the same state converge on one object', async ({ expect }) => {
    const [spaceKey] = PublicKey.randomSequence();
    await using network = await new TestReplicationNetwork().open();
    await using peer1 = await builder.createPeer({ types: [TestSchema.Task] });
    await using peer2 = await builder.createPeer({ types: [TestSchema.Task] });
    await peer1.host.addReplicator(Context.default(), await network.createReplicator());
    await peer2.host.addReplicator(Context.default(), await network.createReplicator());

    await using db1 = await peer1.createDatabase(spaceKey);
    const first = seed(db1, 'from peer 1');
    await db1.flush();

    await using db2 = await peer2.openDatabase(spaceKey, db1.rootUrl!);
    const second = seed(db2, 'from peer 2');
    await db2.flush();

    // Both duplicates have reached peer 1 — visible only through the tombstone-inclusive view,
    // since the worker merges them as they index.
    await db1.waitUntilHeadsReplicated(await db2.getDocumentHeads());
    await waitForAllTasks(db1, 2);

    // No merge call anywhere: each peer's worker notices the collision while indexing the
    // replicated write, and the winner is a pure function of the id set.
    const winner = first.id < second.id ? first.id : second.id;
    await waitForLiveWinner(db1, winner);
    await waitForLiveWinner(db2, winner);
  });

  test('both peers merging independently agree on the same winner', async ({ expect }) => {
    const [spaceKey] = PublicKey.randomSequence();
    await using network = await new TestReplicationNetwork().open();
    await using peer1 = await builder.createPeer({ types: [TestSchema.Task] });
    await using peer2 = await builder.createPeer({ types: [TestSchema.Task] });
    await peer1.host.addReplicator(Context.default(), await network.createReplicator());
    await peer2.host.addReplicator(Context.default(), await network.createReplicator());

    await using db1 = await peer1.createDatabase(spaceKey);
    const first = seed(db1, 'from peer 1');
    await db1.flush();

    await using db2 = await peer2.openDatabase(spaceKey, db1.rootUrl!);
    const second = seed(db2, 'from peer 2');
    await db2.flush();

    // Both workers merge independently — the redundant execution the design accepts as safe
    // because the result is deterministic, so they converge instead of fighting.
    await db1.waitUntilHeadsReplicated(await db2.getDocumentHeads());
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());

    const winner = first.id < second.id ? first.id : second.id;
    await waitForLiveWinner(db1, winner);
    await waitForLiveWinner(db2, winner);
  });

  test('edits made to a loser after the merge are folded into the winner', async ({ expect }) => {
    const [spaceKey] = PublicKey.randomSequence();
    await using network = await new TestReplicationNetwork().open();
    await using peer1 = await builder.createPeer({ types: [TestSchema.Task] });
    await using peer2 = await builder.createPeer({ types: [TestSchema.Task] });
    await peer1.host.addReplicator(Context.default(), await network.createReplicator());
    await peer2.host.addReplicator(Context.default(), await network.createReplicator());

    await using db1 = await peer1.createDatabase(spaceKey);
    const first = seed(db1, 'from peer 1');
    await db1.flush();

    await using db2 = await peer2.openDatabase(spaceKey, db1.rootUrl!);
    const second = seed(db2, 'from peer 2');
    await db2.flush();
    await db1.waitUntilHeadsReplicated(await db2.getDocumentHeads());
    await waitForAllTasks(db1, 2);

    // Peer 1's worker merges; peer 2 is a straggler that has not seen the merge and keeps editing
    // its own copy, which is about to become the loser.
    const winner = first.id < second.id ? first.id : second.id;
    await waitForLiveWinner(db1, winner);
    await db1.flush();

    const loserId = winner === first.id ? second.id : first.id;
    await waitForCondition({
      condition: async () => (await allTasks(db2)).some((task: any) => task.id === loserId),
      timeout: 5_000,
    });
    const loser = (await allTasks(db2)).find((task: any) => task.id === loserId);
    Obj.update(loser, (loser: any) => {
      loser.description = 'written after the merge';
    });
    await db2.flush();
    await db1.waitUntilHeadsReplicated(await db2.getDocumentHeads());

    await waitForCondition({
      condition: async () => (await allTasks(db1)).some((task: any) => task.id === loserId && task.description),
      timeout: 5_000,
    });

    // Re-running the field-wise merge would not rescue this: it prefers the smallest id, which is
    // the winner. The fold carries exactly the late edit across.
    const all = await allTasks(db1);
    expect(foldLateEdits(all)).toBe(1);
    await db1.flush();

    const survivors = await liveTasks(db1);
    expect(survivors).toHaveLength(1);
    expect(survivors[0].id).toBe(winner);
    expect(survivors[0].description).toBe('written after the merge');

    // The watermark advanced, so the same edit is not folded twice.
    expect(foldLateEdits(await allTasks(db1))).toBe(0);
  });

  test('a partial view merges into a chain that still resolves to the global minimum', async ({ expect }) => {
    const [spaceKey] = PublicKey.randomSequence();
    await using network = await new TestReplicationNetwork().open();
    await using peer1 = await builder.createPeer({ types: [TestSchema.Task] });
    await using peer2 = await builder.createPeer({ types: [TestSchema.Task] });
    await peer1.host.addReplicator(Context.default(), await network.createReplicator());
    await peer2.host.addReplicator(Context.default(), await network.createReplicator());

    await using db1 = await peer1.createDatabase(spaceKey);
    const first = seed(db1, 'first');
    await db1.flush();

    await using db2 = await peer2.openDatabase(spaceKey, db1.rootUrl!);
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());

    // Peer 2 adds two more duplicates and merges only the pair it created, in the same tick — a
    // peer acting on a strict subset of the duplicates, which is what produces redirect chains
    // rather than one hop.
    const second = seed(db2, 'second');
    const third = seed(db2, 'third');
    const partial = mergeDuplicates([second, third]);
    expect(partial.merged).toHaveLength(1);
    await db2.flush();

    // The workers see the full view and collapse what remains.
    const globalMinimum = [first.id, second.id, third.id].sort()[0];
    await waitForLiveWinner(db1, globalMinimum);
    await waitForLiveWinner(db2, globalMinimum);

    // Every id — including the one merged away twice — reaches the global minimum by following
    // redirects transitively.
    for (const db of [db1, db2]) {
      const all = await allTasks(db);
      for (const id of [first.id, second.id, third.id]) {
        expect(resolveMerged(id, all)).toBe(globalMinimum);
      }
    }
  });
});
