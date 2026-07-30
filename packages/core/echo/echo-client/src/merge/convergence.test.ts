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
  // which settles a tick later. Waiting on the observable result rather than on sync keeps these
  // tests deterministic — without this the merge can run against a view that is one object short.
  const waitForLiveTasks = (db: any, count: number) =>
    waitForCondition({
      condition: async () => (await liveTasks(db)).length === count,
      timeout: 5_000,
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

    // Both duplicates are now visible to peer 1.
    await db1.waitUntilHeadsReplicated(await db2.getDocumentHeads());
    await waitForLiveTasks(db1, 2);

    // Either peer may run the merge; the winner is a pure function of the id set, so it does not
    // matter which one does.
    const merged = mergeDuplicates(await liveTasks(db1));
    await db1.flush();
    expect(merged.merged).toHaveLength(1);

    const winner = first.id < second.id ? first.id : second.id;
    expect(merged.merged[0].winner).toBe(winner);

    const survivors = await liveTasks(db1);
    expect(survivors).toHaveLength(1);
    expect(survivors[0].id).toBe(winner);

    // Peer 2 sees the same single object once the merge replicates.
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await waitForLiveTasks(db2, 1);
    const survivorsOnPeer2 = await liveTasks(db2);
    expect(survivorsOnPeer2).toHaveLength(1);
    expect(survivorsOnPeer2[0].id).toBe(winner);
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

    // Both peers see both duplicates, then both run the merge — the redundant work the
    // client-on-space-open decision accepts as safe because the result is deterministic.
    await db1.waitUntilHeadsReplicated(await db2.getDocumentHeads());
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await waitForLiveTasks(db1, 2);
    await waitForLiveTasks(db2, 2);

    const merged1 = mergeDuplicates(await liveTasks(db1));
    const merged2 = mergeDuplicates(await liveTasks(db2));
    await db1.flush();
    await db2.flush();

    expect(merged1.merged[0].winner).toBe(merged2.merged[0].winner);

    const winner = first.id < second.id ? first.id : second.id;
    await db1.waitUntilHeadsReplicated(await db2.getDocumentHeads());
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    for (const db of [db1, db2]) {
      await waitForLiveTasks(db, 1);
      const survivors = await liveTasks(db);
      expect(survivors).toHaveLength(1);
      expect(survivors[0].id).toBe(winner);
    }
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
    await waitForLiveTasks(db1, 2);

    // Peer 1 merges; peer 2 is a straggler that has not seen the merge and keeps editing its own
    // copy, which is about to become the loser.
    const merged = mergeDuplicates(await liveTasks(db1));
    await db1.flush();
    const winner = merged.merged[0].winner;
    expect(winner).toBe(first.id < second.id ? first.id : second.id);

    const loserId = merged.merged[0].losers[0];
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

    // Peer 2 adds two more duplicates but merges only the pair it created — a peer acting on a
    // strict subset of the duplicates, which is what produces redirect chains rather than one hop.
    const second = seed(db2, 'second');
    const third = seed(db2, 'third');
    await db2.flush();

    await waitForLiveTasks(db2, 3);
    const partialView = (await liveTasks(db2)).filter((task: any) => task.id === second.id || task.id === third.id);
    const partial = mergeDuplicates(partialView);
    await db2.flush();
    expect(partial.merged).toHaveLength(1);

    // Now a peer with the full view merges everything.
    await db1.waitUntilHeadsReplicated(await db2.getDocumentHeads());
    await waitForLiveTasks(db1, 2);
    const full = mergeDuplicates(await liveTasks(db1));
    await db1.flush();

    // Peer 1's live view is now {first, whichever of second/third survived}, so one group remains.
    const globalMinimum = [first.id, second.id, third.id].sort()[0];
    expect(full.merged).toHaveLength(1);
    expect(full.merged[0].winner).toBe(globalMinimum);

    // Every id — including the one merged away twice — reaches the global minimum by following
    // redirects transitively.
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    const all = await allTasks(db1);
    for (const id of [first.id, second.id, third.id]) {
      expect(resolveMerged(id, all)).toBe(globalMinimum);
    }

    const survivors = await liveTasks(db1);
    expect(survivors).toHaveLength(1);
    expect(survivors[0].id).toBe(globalMinimum);
  });
});
