//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { waitForCondition } from '@dxos/async';
import { Context } from '@dxos/context';
import { Filter, Merge, Obj, Query, Relation } from '@dxos/echo';
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

    // No fold call anywhere: the late edit re-indexes the tombstoned loser, and the worker
    // carries the changed fields to the winner. Re-running the field-wise merge would not
    // rescue this — it prefers the smallest id, which is the winner.
    for (const db of [db1, db2]) {
      await waitForCondition({
        condition: async () => {
          const live = await liveTasks(db);
          return live.length === 1 && live[0].id === winner && live[0].description === 'written after the merge';
        },
        timeout: 10_000,
      });
    }

    // The watermark advanced, so a manual pass finds nothing left to fold.
    expect(foldLateEdits(await allTasks(db1))).toBe(0);
  });

  test('a restored loser is re-tombstoned and its edits carried to the winner', async ({ expect }) => {
    const [spaceKey] = PublicKey.randomSequence();
    await using peer = await builder.createPeer({ types: [TestSchema.Task] });
    await using db = await peer.createDatabase(spaceKey);

    const first = seed(db, 'one');
    const second = seed(db, 'two');
    await db.flush();

    const winner = first.id < second.id ? first.id : second.id;
    await waitForLiveWinner(db, winner);

    // `db.add` un-deletes a tombstone, which would otherwise leave a live duplicate that
    // detection ignores forever. Editing in the same tick makes one indexing pass see both.
    const loserId = winner === first.id ? second.id : first.id;
    const loser = (await allTasks(db)).find((task: any) => task.id === loserId);
    db.add(loser);
    Obj.update(loser, (loser: any) => {
      loser.description = 'edited after the restore';
    });
    await db.flush();

    // The redirect is sticky: the restore converges back to one live entity, and the restore's
    // edit survives on the winner rather than on the re-tombstoned loser.
    await waitForCondition({
      condition: async () => {
        const live = await liveTasks(db);
        return live.length === 1 && live[0].id === winner && live[0].description === 'edited after the restore';
      },
      timeout: 10_000,
    });
  });

  test('relations sharing a natural key are not merged', async ({ expect }) => {
    const [spaceKey] = PublicKey.randomSequence();
    await using peer = await builder.createPeer({
      types: [TestSchema.Task, TestSchema.Person, TestSchema.Organization, TestSchema.EmployedBy],
    });
    await using db = await peer.createDatabase(spaceKey);

    // `Merge.setNaturalKey` rejects relations, so stamp the key the way a legacy or hostile
    // writer would — directly on meta — and verify the worker refuses to act on it.
    const makeEmployment = () => {
      const person = db.add(Obj.make(TestSchema.Person, { name: 'someone' }));
      const organization = db.add(Obj.make(TestSchema.Organization, { name: 'somewhere' }));
      const employment = db.add(
        Relation.make(TestSchema.EmployedBy, {
          [Relation.Source]: person,
          [Relation.Target]: organization,
          role: 'employee',
        }),
      );
      Relation.update(employment, (employment) => {
        Relation.getMeta(employment).naturalKey = 'org.example.employment';
      });
      return employment;
    };
    const employment1 = makeEmployment();
    const employment2 = makeEmployment();

    // Sentinel pair: once these tasks have merged, the worker has provably processed the batch
    // that also carried the relations' key.
    const first = seed(db, 'one');
    const second = seed(db, 'two');
    await db.flush();
    await waitForLiveWinner(db, first.id < second.id ? first.id : second.id);

    const employments = await db.query(Filter.type(TestSchema.EmployedBy)).run();
    expect(employments.map((relation: any) => relation.id).sort()).toEqual([employment1.id, employment2.id].sort());
  });

  test('a long-string field folds across without corruption', async ({ expect }) => {
    const [spaceKey] = PublicKey.randomSequence();
    await using peer = await builder.createPeer({ types: [TestSchema.Task] });
    await using db = await peer.createDatabase(spaceKey);

    // Above 300k characters the client stores the value as an unmergeable raw string, which a
    // naive deep-clone in the worker would flatten into a `{ val }` map. Stamp it on the loser,
    // so the merge must carry it across documents.
    const longText = 'x'.repeat(300_001);
    const first = seed(db, 'one');
    const second = seed(db, 'two');
    const loser = first.id < second.id ? second : first;
    Obj.update(loser, (loser: any) => {
      loser.description = longText;
    });
    await db.flush();

    const winner = first.id < second.id ? first.id : second.id;
    await waitForLiveWinner(db, winner);

    const [survivor] = await liveTasks(db);
    expect(typeof survivor.description).toBe('string');
    expect(survivor.description).toBe(longText);
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
    // A straggler edit on the just-tombstoned deepest loser: the workers collapse the rest of
    // the chain in the same pass, and the fold must follow the redirect written moments earlier
    // to its live end rather than advancing the watermark past the edit on an aborted write.
    Obj.update(third, (third) => {
      third.description = 'straggler on the chain';
    });
    await db2.flush();

    // The workers see the full view and collapse what remains.
    const globalMinimum = [first.id, second.id, third.id].sort()[0];
    await waitForLiveWinner(db1, globalMinimum);
    await waitForLiveWinner(db2, globalMinimum);

    // Every id — including the one merged away twice — reaches the global minimum by following
    // redirects transitively, and the straggler edit survived the chain collapse.
    for (const db of [db1, db2]) {
      const all = await allTasks(db);
      for (const id of [first.id, second.id, third.id]) {
        expect(resolveMerged(id, all)).toBe(globalMinimum);
      }
      await waitForCondition({
        condition: async () => {
          const [live] = await liveTasks(db);
          return live !== undefined && live.description === 'straggler on the chain';
        },
        timeout: 10_000,
      });
    }
  });

  test('a user-deleted duplicate is not merged, in either direction', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [TestSchema.Task] });
    await using db = await peer.createDatabase();

    // The smaller-id duplicate is deleted by the user; a live twin with the same key arrives
    // later (a re-seed). Merging them would either crown the deleted entity the winner —
    // vanishing every copy at once — or resurrect deleted data into the live one.
    const deletedTwin = seed(db, 'deleted by the user');
    db.remove(deletedTwin);
    const liveTwin = seed(db, 'seeded again');

    // A sentinel pair under a different key that does merge — proof the worker pass ran and
    // examined this batch, rather than simply not having gotten to it yet.
    const sentinelFirst = db.add(Obj.make(TestSchema.Task, { title: 'sentinel first' }));
    Merge.setNaturalKey(sentinelFirst, 'org.example.sentinel');
    const sentinelSecond = db.add(Obj.make(TestSchema.Task, { title: 'sentinel second' }));
    Merge.setNaturalKey(sentinelSecond, 'org.example.sentinel');
    await db.flush();

    // The client pass declines the deleted twin outright.
    const result = mergeDuplicates([deletedTwin, liveTwin]);
    expect(result.merged).toHaveLength(0);

    await waitForCondition({
      condition: async () => {
        const live = await liveTasks(db);
        return live.filter((task: Obj.Unknown) => Merge.getNaturalKey(task) === 'org.example.sentinel').length === 1;
      },
      timeout: 10_000,
    });

    // The worker reached the same verdict: nothing under the seed key was redirected, and the
    // live twin is still the one visible object for it.
    const live = await liveTasks(db);
    const seedLive = live.filter((task: Obj.Unknown) => Merge.getNaturalKey(task) === 'org.example.seed');
    expect(seedLive).toHaveLength(1);
    expect(seedLive[0].id).toBe(liveTwin.id);
    const all = await allTasks(db);
    expect(resolveMerged(deletedTwin.id, all)).toBe(deletedTwin.id);
    expect(resolveMerged(liveTwin.id, all)).toBe(liveTwin.id);
  });
});
