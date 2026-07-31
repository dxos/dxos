//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { waitForCondition } from '@dxos/async';
import { Database, Filter, Merge, Obj, Query, Ref } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { EffectEx } from '@dxos/effect';

import { EchoTestBuilder } from '../testing';
import { getMergedFrom, mergeDuplicates, resolveMerged, rewriteReferences } from './merge-executor';

describe('Merge', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  // The natural key rides in `@meta`, so it has to survive create -> add -> flush -> query.
  test('a natural key round-trips through the database', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [TestSchema.Task] });
    const db = await peer.createDatabase();

    await Effect.gen(function* () {
      const task = Obj.make(TestSchema.Task, { title: 'seeded' });
      Merge.setNaturalKey(task, 'org.example.seed');
      const added = yield* Database.add(task);
      expect(Merge.getNaturalKey(added)).toBe('org.example.seed');

      yield* Database.flush();

      const [queried] = yield* Database.query(Filter.type(TestSchema.Task)).run;
      expect(Merge.getNaturalKey(queried)).toBe('org.example.seed');
    }).pipe(Effect.provide(Database.layer(db)), EffectEx.runAndForwardErrors);
  });

  test('the natural key survives a reload from storage', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [TestSchema.Task] });
    const db = await peer.createDatabase();

    await Effect.gen(function* () {
      const task = Obj.make(TestSchema.Task, { title: 'seeded' });
      Merge.setNaturalKey(task, 'org.example.seed');
      yield* Database.add(task);
      yield* Database.flush();
    }).pipe(Effect.provide(Database.layer(db)), EffectEx.runAndForwardErrors);

    await peer.close();
    await peer.open();
    const reopened = await peer.openLastDatabase();

    await Effect.gen(function* () {
      const [queried] = yield* Database.query(Filter.type(TestSchema.Task)).run;
      expect(Merge.getNaturalKey(queried)).toBe('org.example.seed');
    }).pipe(Effect.provide(Database.layer(reopened)), EffectEx.runAndForwardErrors);
  });

  // The duplication this exists to fix: two uncoordinated writers each create "the same" object.
  test('duplicates sharing a natural key are detected and merged deterministically', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [TestSchema.Task] });
    const db = await peer.createDatabase();

    await Effect.gen(function* () {
      const first = Obj.make(TestSchema.Task, { title: 'from the first writer' });
      Merge.setNaturalKey(first, 'org.example.seed');
      yield* Database.add(first);

      const second = Obj.make(TestSchema.Task, { title: 'from the second writer', description: 'only here' });
      Merge.setNaturalKey(second, 'org.example.seed');
      yield* Database.add(second);

      yield* Database.flush();

      // Deliberately not via a query: a query collapses duplicates on sight, so this exercises the
      // pure detection over the two entities directly.
      const duplicates = Merge.findDuplicates([first, second].map(Merge.candidateOf));
      expect(duplicates.size).toBe(1);

      const result = Merge.merge(duplicates.get('org.example.seed')!);
      // Ids are ULIDs minted in creation order, so the first writer's object wins.
      expect(result.winner).toBe(first.id);
      expect(result.losers).toEqual([second.id]);
      expect(result.data.title).toBe('from the first writer');
      expect(result.data.description).toBe('only here');
    }).pipe(Effect.provide(Database.layer(db)), EffectEx.runAndForwardErrors);
  });

  test('a merge pass collapses duplicates to one live object', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [TestSchema.Task] });
    const db = await peer.createDatabase();

    await Effect.gen(function* () {
      const first = Obj.make(TestSchema.Task, { title: 'from the first writer' });
      Merge.setNaturalKey(first, 'org.example.seed');
      yield* Database.add(first);

      const second = Obj.make(TestSchema.Task, { title: 'from the second writer', description: 'only here' });
      Merge.setNaturalKey(second, 'org.example.seed');
      yield* Database.add(second);

      // Same tick as the adds, before the worker can see the documents; either engine computes
      // the identical result, this just keeps the assertion on `merged` deterministic.
      const result = mergeDuplicates([first, second]);
      expect(result.merged).toHaveLength(1);
      expect(result.merged[0].winner).toBe(first.id);
      yield* Database.flush();

      // The loser is tombstoned, so a plain query sees exactly one object.
      const after = yield* Database.query(Filter.type(TestSchema.Task)).run;
      expect(after).toHaveLength(1);
      expect(after[0].id).toBe(first.id);
      // The winner absorbed the field only the loser defined.
      expect(after[0].title).toBe('from the first writer');
      expect(after[0].description).toBe('only here');
    }).pipe(Effect.provide(Database.layer(db)), EffectEx.runAndForwardErrors);
  });

  test('a second merge pass is a no-op', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [TestSchema.Task] });
    const db = await peer.createDatabase();

    const tasks = ['first', 'second', 'third'].map((title) => {
      const task = db.add(Obj.make(TestSchema.Task, { title }));
      Merge.setNaturalKey(task, 'org.example.seed');
      return task;
    });
    await db.flush();

    // The worker merges off the indexing stream; wait for it to converge, then an explicit pass
    // over the survivors finds nothing left to do.
    await waitForCondition({
      condition: async () => (await db.query(Filter.type(TestSchema.Task)).run()).length === 1,
      timeout: 10_000,
    });
    const after = await db.query(Filter.type(TestSchema.Task)).run();
    expect(mergeDuplicates(after).merged).toHaveLength(0);
    expect(after[0].id).toBe(tasks.map(({ id }) => id).sort()[0]);
  });

  test('a merged-away object redirects to the winner instead of vanishing', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [TestSchema.Task] });
    const db = await peer.createDatabase();

    await Effect.gen(function* () {
      const first = Obj.make(TestSchema.Task, { title: 'first' });
      const second = Obj.make(TestSchema.Task, { title: 'second' });
      for (const task of [first, second]) {
        Merge.setNaturalKey(task, 'org.example.seed');
        yield* Database.add(task);
      }
      mergeDuplicates([first, second]);
      yield* Database.flush();

      // The loser is tombstoned but still resolvable, which is what makes a stale reference to it
      // reach the winner rather than dangle.
      expect(resolveMerged(second.id, [first, second])).toBe(first.id);
      expect(resolveMerged(first.id, [first, second])).toBe(first.id);
    }).pipe(Effect.provide(Database.layer(db)), EffectEx.runAndForwardErrors);
  });

  test('references to a merged-away object are rewritten to the winner', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [TestSchema.Task] });
    const db = await peer.createDatabase();

    await Effect.gen(function* () {
      const first = Obj.make(TestSchema.Task, { title: 'first' });
      const second = Obj.make(TestSchema.Task, { title: 'second' });
      for (const task of [first, second]) {
        Merge.setNaturalKey(task, 'org.example.seed');
        yield* Database.add(task);
      }

      // Declares no natural key, so it is a referrer rather than a merge candidate, and it points
      // at the object that is about to lose the merge.
      const referrer = Obj.make(TestSchema.Task, { title: 'referrer', previous: Ref.make(second) });
      yield* Database.add(referrer);
      // Same tick as the adds, so the redirect exists regardless of whether the worker races.
      mergeDuplicates([first, second]);
      yield* Database.flush();

      const all = yield* Database.query(Query.select(Filter.type(TestSchema.Task)).options({ deleted: 'include' })).run;
      expect(rewriteReferences([referrer], all)).toBe(1);
      yield* Database.flush();

      expect(referrer.previous!.uri).toContain(first.id);
      // Idempotent: a second pass finds nothing left pointing at a loser.
      expect(rewriteReferences([referrer], all)).toBe(0);
    }).pipe(Effect.provide(Database.layer(db)), EffectEx.runAndForwardErrors);
  });

  // The database-level entry point: detection, merge, and reference rewriting in one pass.
  test('db.mergeDuplicates collapses duplicates and repoints references', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [TestSchema.Task] });
    const db = await peer.createDatabase();

    const first = db.add(Obj.make(TestSchema.Task, { title: 'first' }));
    const second = db.add(Obj.make(TestSchema.Task, { title: 'second', description: 'only here' }));
    for (const task of [first, second]) {
      Merge.setNaturalKey(task, 'org.example.seed');
    }
    const referrer = db.add(Obj.make(TestSchema.Task, { title: 'referrer', previous: Ref.make(second) }));
    await db.flush();

    // The worker may or may not have merged already (its trigger raced the flush); either way
    // this pass leaves exactly one survivor and repoints the reference — so assert the outcome,
    // not who did the merging.
    await db.mergeDuplicates();

    const survivors = await db.query(Filter.type(TestSchema.Task)).run();
    expect(survivors.map((task) => task.id).sort()).toEqual([first.id, referrer.id].sort());
    expect(first.description).toBe('only here');
    expect(referrer.previous!.uri).toContain(first.id);

    // Idempotent: running again finds nothing and writes nothing.
    expect((await db.mergeDuplicates()).merged).toHaveLength(0);
  });

  test('db.mergeDuplicates leaves a space with no natural keys untouched', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [TestSchema.Task] });
    const db = await peer.createDatabase();

    db.add(Obj.make(TestSchema.Task, { title: 'first' }));
    db.add(Obj.make(TestSchema.Task, { title: 'second' }));
    await db.flush();

    expect((await db.mergeDuplicates()).merged).toHaveLength(0);
    expect(await db.query(Filter.type(TestSchema.Task)).run()).toHaveLength(2);
  });

  test('the winner records what merged into it', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [TestSchema.Task] });
    const db = await peer.createDatabase();

    const tasks = ['first', 'second', 'third'].map((title) => {
      const task = db.add(Obj.make(TestSchema.Task, { title }));
      Merge.setNaturalKey(task, 'org.example.seed');
      return task;
    });

    const [winner, ...losers] = [...tasks].sort((a, b) => (a.id < b.id ? -1 : 1));
    expect(getMergedFrom(winner)).toEqual([]);

    // Same tick as the adds, so this pass runs before the worker can see the documents; the
    // outcome is identical either way, since both engines compute the same pure function.
    mergeDuplicates(tasks);
    await db.flush();
    expect(getMergedFrom(winner)).toEqual(losers.map(({ id }) => id).sort());

    // Each loser still resolves, so the recorded ids are usable rather than dangling.
    const all = await db.query(Query.select(Filter.type(TestSchema.Task)).options({ deleted: 'include' })).run();
    for (const id of getMergedFrom(winner)) {
      expect(all.some((task) => task.id === id)).toBe(true);
    }

    // Idempotent: a second pass — client or worker — adds nothing.
    await db.mergeDuplicates();
    expect(getMergedFrom(winner)).toEqual(losers.map(({ id }) => id).sort());
  });

  test('a collapsing chain carries the absorbed ids forward', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [TestSchema.Task] });
    const db = await peer.createDatabase();

    const tasks = ['a', 'b', 'c'].map((title) => {
      const task = db.add(Obj.make(TestSchema.Task, { title }));
      Merge.setNaturalKey(task, 'org.example.seed');
      return task;
    });
    const [smallest, middle, largest] = [...tasks].sort((a, b) => (a.id < b.id ? -1 : 1));

    // Merge only the two larger ones first, as a peer with a partial view would — staged in the
    // same tick as the adds, before the worker sees the documents.
    mergeDuplicates([middle, largest]);
    expect(getMergedFrom(middle)).toEqual([largest.id]);
    await db.flush();

    // The worker collapses the remaining pair; the chain must not lose the id `middle` had
    // already absorbed.
    await waitForCondition({
      condition: async () => getMergedFrom(smallest).length === 2,
      timeout: 10_000,
    });
    expect(getMergedFrom(smallest)).toEqual([middle.id, largest.id].sort());
  });

  // The §2 failure shape: callers that read `results.length` or assert a singleton break on a
  // duplicate they did not create. The query must never hand them two.
  describe('worker-driven merging', () => {
    // Merging is triggered by the worker's indexing stream, so convergence is awaited rather than
    // synchronous with any one query.
    const waitForLiveCount = async (db: any, count: number) =>
      waitForCondition({
        condition: async () => (await db.query(Filter.type(TestSchema.Task)).run()).length === count,
        timeout: 10_000,
      });

    test('duplicates converge without anyone calling the merge', async ({ expect }) => {
      await using peer = await builder.createPeer({ types: [TestSchema.Task] });
      const db = await peer.createDatabase();

      const tasks = ['first', 'second'].map((title) => {
        const task = db.add(Obj.make(TestSchema.Task, { title, description: title }));
        Merge.setNaturalKey(task, 'org.example.seed');
        return task;
      });
      await db.flush();
      const winner = tasks[0].id < tasks[1].id ? tasks[0] : tasks[1];

      // No merge call anywhere — the worker notices the collision while indexing the writes.
      await waitForLiveCount(db, 1);
      const results = await db.query(Filter.type(TestSchema.Task)).run();
      expect(results[0].id).toBe(winner.id);
      expect(getMergedFrom(winner)).toHaveLength(1);
    });

    test('the merge is durable, not filtered out of one result', async ({ expect }) => {
      await using peer = await builder.createPeer({ types: [TestSchema.Task] });
      const db = await peer.createDatabase();

      for (const title of ['first', 'second', 'third']) {
        const task = db.add(Obj.make(TestSchema.Task, { title }));
        Merge.setNaturalKey(task, 'org.example.seed');
      }
      await db.flush();
      await waitForLiveCount(db, 1);

      // A fresh query sees one because the losers are tombstoned, not because it re-filtered.
      const live = await db.query(Filter.type(TestSchema.Task)).run();
      expect(live).toHaveLength(1);
      const all = await db.query(Query.select(Filter.type(TestSchema.Task)).options({ deleted: 'include' })).run();
      expect(all).toHaveLength(3);
    });

    test('repeated queries settle rather than looping', async ({ expect }) => {
      await using peer = await builder.createPeer({ types: [TestSchema.Task] });
      const db = await peer.createDatabase();

      for (const title of ['first', 'second']) {
        const task = db.add(Obj.make(TestSchema.Task, { title }));
        Merge.setNaturalKey(task, 'org.example.seed');
      }
      await db.flush();
      await waitForLiveCount(db, 1);

      // The merge writes re-enter the indexing stream; idempotence is what stops that recurring.
      const winner = (await db.query(Filter.type(TestSchema.Task)).run())[0];
      const absorbed = getMergedFrom(winner);
      expect(absorbed).toHaveLength(1);
      for (let attempt = 0; attempt < 3; attempt++) {
        const results = await db.query(Filter.type(TestSchema.Task)).run();
        expect(results).toHaveLength(1);
        expect(results[0].id).toBe(winner.id);
        expect(getMergedFrom(winner)).toEqual(absorbed);
      }
    });

    test('a query over entities with no natural key is untouched', async ({ expect }) => {
      await using peer = await builder.createPeer({ types: [TestSchema.Task] });
      const db = await peer.createDatabase();

      db.add(Obj.make(TestSchema.Task, { title: 'first' }));
      db.add(Obj.make(TestSchema.Task, { title: 'second' }));
      await db.flush();

      expect(await db.query(Filter.type(TestSchema.Task)).run()).toHaveLength(2);
    });

    test('entities with distinct natural keys are both returned', async ({ expect }) => {
      await using peer = await builder.createPeer({ types: [TestSchema.Task] });
      const db = await peer.createDatabase();

      for (const naturalKey of ['org.example.seed', 'org.example.seed@2']) {
        const task = db.add(Obj.make(TestSchema.Task, { title: naturalKey }));
        Merge.setNaturalKey(task, naturalKey);
      }
      await db.flush();

      expect(await db.query(Filter.type(TestSchema.Task)).run()).toHaveLength(2);
    });
  });

  test('objects with distinct natural keys are not duplicates', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [TestSchema.Task] });
    const db = await peer.createDatabase();

    await Effect.gen(function* () {
      for (const naturalKey of ['org.example.seed', 'org.example.seed@2', 'org.example.other']) {
        const task = Obj.make(TestSchema.Task, { title: naturalKey });
        Merge.setNaturalKey(task, naturalKey);
        yield* Database.add(task);
      }
      yield* Database.flush();

      const tasks = yield* Database.query(Filter.type(TestSchema.Task)).run;
      expect(Merge.findDuplicates(tasks.map(Merge.candidateOf)).size).toBe(0);
    }).pipe(Effect.provide(Database.layer(db)), EffectEx.runAndForwardErrors);
  });
});
