//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { waitForCondition } from '@dxos/async';
import { Filter, Obj, Query, Relation } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { type EntityId } from '@dxos/keys';

import { type SqliteDatabase } from '../database.ts';
import { type SpaceSync } from '../sync/space-sync.ts';
import { TestBuilder } from '../testing/harness.ts';

//
// echo-client-e2e's convergence suite over echo-sqlite: peers initialize the same application state
// without coordinating, so each mints its own object and sync surfaces the duplicates. Peers sync
// through an in-process authority rather than a replication network, and merge records are read with
// `getMergeRecord` rather than through echo-client's object cores.
//

const TYPES = [TestSchema.Task];

const setConvergenceKey = (object: Obj.Unknown, convergenceKey: string | undefined) =>
  Obj.update(object, (object) => {
    Obj.getMeta(object).convergenceKey = convergenceKey;
  });

const seed = (db: SqliteDatabase, title: string) => {
  const task = db.add(Obj.make(TestSchema.Task, { title }));
  setConvergenceKey(task, 'org.example.seed');
  return task;
};

const liveTasks = (db: SqliteDatabase) => db.query(Filter.type(TestSchema.Task)).run();

// Merged-away losers are tombstoned, so following a redirect needs the deleted ones too.
const allTasks = (db: SqliteDatabase) =>
  db.query(Query.select(Filter.type(TestSchema.Task)).options({ deleted: 'include' })).run();

/** Follows merge redirects from `start` to their live end, as the storage records them. */
const resolveMerged = async (db: SqliteDatabase, start: EntityId): Promise<EntityId> => {
  const all = new Map((await allTasks(db)).map((task) => [task.id, task]));
  let current = start;
  for (let hop = 0; hop < all.size; hop++) {
    const entity = all.get(current);
    const next = entity && (await db.getMergeRecord(entity)).mergedInto;
    if (next === undefined || next >= current) {
      break;
    }
    current = next;
  }
  return current;
};

const waitForAllTasks = (db: SqliteDatabase, count: number) =>
  waitForCondition({ condition: async () => (await allTasks(db)).length === count, timeout: 5_000 });

const waitForLiveWinner = (db: SqliteDatabase, winner: string) =>
  waitForCondition({
    condition: async () => {
      const live = await liveTasks(db);
      return live.length === 1 && live[0].id === winner;
    },
    timeout: 10_000,
  });

/** Flushes each database and waits for its sync round, a few times over, so announcements are acted on. */
const settle = async (...pairs: [SqliteDatabase, SpaceSync][]): Promise<void> => {
  for (let pass = 0; pass < 3; pass++) {
    for (const [db, sync] of pairs) {
      await db.flush();
      await sync.synced();
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
};

/** Two peers of one space, each syncing through the same authority. */
const twoPeers = async (builder: TestBuilder) => {
  const authority = builder.createAuthority();
  const peer1 = builder.createPeer({ types: TYPES });
  const peer2 = builder.createPeer({ types: TYPES });
  const db1 = await peer1.createDatabase();
  const db2 = await peer2.openDatabase(db1.spaceId);
  const sync1 = peer1.sync(db1, authority);
  const sync2 = peer2.sync(db2, authority);
  return { db1, db2, sync1, sync2 };
};

describe('merge convergence', () => {
  test('two peers seeding the same state converge on one object', async () => {
    await using builder = new TestBuilder();
    const { db1, db2, sync1, sync2 } = await twoPeers(builder);

    const first = seed(db1, 'from peer 1');
    await settle([db1, sync1], [db2, sync2]);
    const second = seed(db2, 'from peer 2');
    await settle([db2, sync2], [db1, sync1]);

    const winner = first.id < second.id ? first.id : second.id;
    await waitForLiveWinner(db1, winner);
    await waitForLiveWinner(db2, winner);
  });

  test('both peers merging independently agree on the same winner', async () => {
    await using builder = new TestBuilder();
    const { db1, db2, sync1, sync2 } = await twoPeers(builder);

    // Seeded before either has seen the other's, so each merges on its own.
    const first = seed(db1, 'from peer 1');
    const second = seed(db2, 'from peer 2');
    await settle([db1, sync1], [db2, sync2]);

    const winner = first.id < second.id ? first.id : second.id;
    await waitForLiveWinner(db1, winner);
    await waitForLiveWinner(db2, winner);
  });

  test('edits made to a loser after the merge are folded into the winner', async ({ expect }) => {
    await using builder = new TestBuilder();
    const { db1, db2, sync1, sync2 } = await twoPeers(builder);

    const first = seed(db1, 'from peer 1');
    await settle([db1, sync1], [db2, sync2]);
    const second = seed(db2, 'from peer 2');
    await settle([db2, sync2], [db1, sync1]);
    await waitForAllTasks(db1, 2);

    const winner = first.id < second.id ? first.id : second.id;
    await waitForLiveWinner(db1, winner);

    // A straggler keeps editing its copy of what has become the loser.
    const loserId = winner === first.id ? second.id : first.id;
    const loser = (await allTasks(db2)).find((task) => task.id === loserId);
    expect(loser).toBeDefined();
    Obj.update(loser!, (loser) => {
      loser.description = 'written after the merge';
    });
    await settle([db2, sync2], [db1, sync1]);

    // The late edit re-indexes the tombstoned loser, and the merge carries the changed field over.
    for (const db of [db1, db2]) {
      await waitForCondition({
        condition: async () => {
          await settle([db1, sync1], [db2, sync2]);
          const live = await liveTasks(db);
          return live.length === 1 && live[0].id === winner && live[0].description === 'written after the merge';
        },
        timeout: 10_000,
      });
    }
  });

  test('a restored loser is re-tombstoned and its edits carried to the winner', async () => {
    await using builder = new TestBuilder();
    const db = await builder.createPeer({ types: TYPES }).createDatabase();

    const first = seed(db, 'one');
    const second = seed(db, 'two');
    await db.flush();

    const winner = first.id < second.id ? first.id : second.id;
    await waitForLiveWinner(db, winner);

    // `db.add` un-deletes a tombstone; editing in the same tick makes one index pass see both.
    const loserId = winner === first.id ? second.id : first.id;
    const loser = (await allTasks(db)).find((task) => task.id === loserId)!;
    db.add(loser);
    Obj.update(loser, (loser) => {
      loser.description = 'edited after the restore';
    });
    await db.flush();

    await waitForCondition({
      condition: async () => {
        const live = await liveTasks(db);
        return live.length === 1 && live[0].id === winner && live[0].description === 'edited after the restore';
      },
      timeout: 10_000,
    });
  });

  test('relations sharing a convergence key are not merged', async ({ expect }) => {
    await using builder = new TestBuilder();
    const db = await builder
      .createPeer({ types: [TestSchema.Task, TestSchema.Person, TestSchema.Organization, TestSchema.EmployedBy] })
      .createDatabase();

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
        Relation.getMeta(employment).convergenceKey = 'org.example.employment';
      });
      return employment;
    };
    const employment1 = makeEmployment();
    const employment2 = makeEmployment();

    // Sentinel pair: once these have merged, the pass that also carried the relations' key has run.
    const first = seed(db, 'one');
    const second = seed(db, 'two');
    await db.flush();
    await waitForLiveWinner(db, first.id < second.id ? first.id : second.id);

    const employments = await db.query(Filter.type(TestSchema.EmployedBy)).run();
    expect(employments.map((relation) => relation.id).sort()).toEqual([employment1.id, employment2.id].sort());
  });

  test('a long-string field folds across without corruption', async ({ expect }) => {
    await using builder = new TestBuilder();
    const db = await builder.createPeer({ types: TYPES }).createDatabase();

    const longText = 'x'.repeat(300_001);
    const first = seed(db, 'one');
    const second = seed(db, 'two');
    const loser = first.id < second.id ? second : first;
    Obj.update(loser, (loser) => {
      loser.description = longText;
    });
    await db.flush();

    const winner = first.id < second.id ? first.id : second.id;
    await waitForLiveWinner(db, winner);

    const [survivor] = await liveTasks(db);
    expect(typeof survivor.description).toBe('string');
    expect(survivor.description).toBe(longText);
  });

  test('a user-deleted duplicate is not merged, in either direction', async ({ expect }) => {
    await using builder = new TestBuilder();
    const db = await builder.createPeer({ types: TYPES }).createDatabase();

    const deletedTwin = seed(db, 'deleted by the user');
    db.remove(deletedTwin);
    const liveTwin = seed(db, 'seeded again');

    // A sentinel pair under another key that does merge: proof the pass examined this batch.
    const sentinelFirst = db.add(Obj.make(TestSchema.Task, { title: 'sentinel first' }));
    setConvergenceKey(sentinelFirst, 'org.example.sentinel');
    const sentinelSecond = db.add(Obj.make(TestSchema.Task, { title: 'sentinel second' }));
    setConvergenceKey(sentinelSecond, 'org.example.sentinel');
    await db.flush();

    await waitForCondition({
      condition: async () =>
        (await liveTasks(db)).filter((task) => Obj.getMeta(task).convergenceKey === 'org.example.sentinel').length ===
        1,
      timeout: 10_000,
    });

    const seedLive = (await liveTasks(db)).filter((task) => Obj.getMeta(task).convergenceKey === 'org.example.seed');
    expect(seedLive).toHaveLength(1);
    expect(seedLive[0].id).toBe(liveTwin.id);
    expect(await resolveMerged(db, deletedTwin.id)).toBe(deletedTwin.id);
    expect(await resolveMerged(db, liveTwin.id)).toBe(liveTwin.id);
  });
});
