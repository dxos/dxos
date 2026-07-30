//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Database, Filter, Merge, Obj, Query, Ref } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { EffectEx } from '@dxos/effect';

import { EchoTestBuilder } from '../testing';
import { mergeDuplicates, resolveMerged, rewriteReferences } from './merge-executor';

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

      const tasks = yield* Database.query(Filter.type(TestSchema.Task)).run;
      expect(tasks).toHaveLength(2);

      const duplicates = Merge.findDuplicates(tasks.map(Merge.candidateOf));
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
      yield* Database.flush();

      const before = yield* Database.query(Filter.type(TestSchema.Task)).run;
      const result = mergeDuplicates(before);
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

    await Effect.gen(function* () {
      for (const title of ['first', 'second', 'third']) {
        const task = Obj.make(TestSchema.Task, { title });
        Merge.setNaturalKey(task, 'org.example.seed');
        yield* Database.add(task);
      }
      yield* Database.flush();

      const before = yield* Database.query(Filter.type(TestSchema.Task)).run;
      expect(mergeDuplicates(before).merged).toHaveLength(1);
      yield* Database.flush();

      const after = yield* Database.query(Filter.type(TestSchema.Task)).run;
      expect(after).toHaveLength(1);
      // Nothing left to merge: the survivors no longer contain a duplicate group.
      expect(mergeDuplicates(after).merged).toHaveLength(0);
    }).pipe(Effect.provide(Database.layer(db)), EffectEx.runAndForwardErrors);
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
      yield* Database.flush();

      const before = yield* Database.query(Filter.type(TestSchema.Task)).run;
      mergeDuplicates(before);
      yield* Database.flush();

      // The loser is tombstoned but still resolvable, which is what makes a stale reference to it
      // reach the winner rather than dangle.
      expect(resolveMerged(second.id, before)).toBe(first.id);
      expect(resolveMerged(first.id, before)).toBe(first.id);
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
      yield* Database.flush();

      const duplicates = (yield* Database.query(Filter.type(TestSchema.Task)).run).filter(
        (task) => Merge.getNaturalKey(task) !== undefined,
      );
      mergeDuplicates(duplicates);
      yield* Database.flush();

      const all = yield* Database.query(Query.select(Filter.type(TestSchema.Task)).options({ deleted: 'include' })).run;
      expect(rewriteReferences([referrer], all)).toBe(1);
      yield* Database.flush();

      expect(referrer.previous!.uri).toContain(first.id);
      // Idempotent: a second pass finds nothing left pointing at a loser.
      expect(rewriteReferences([referrer], all)).toBe(0);
    }).pipe(Effect.provide(Database.layer(db)), EffectEx.runAndForwardErrors);
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
