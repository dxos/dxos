//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, expect, onTestFinished, test } from 'vitest';

import { Aggregate, type Entity, Filter, Obj, Order, Query, type QueryResult, Scope } from '@dxos/echo';
import { DatabaseImpl, type EchoDatabase } from '@dxos/echo-client';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { TestSchema } from '@dxos/echo/testing';
import { invariant } from '@dxos/invariant';
import { EID, EntityId } from '@dxos/keys';

// Exercises `packages/core/echo/echo-client/docs/SYNC_QUERIES.md`: a local write reaches a live query's
// subscribers before the writing call returns, an index entry never outlives local evidence against it,
// and every write produces exactly the notifications its effect on the result calls for.

/** One subscriber notification: the ids it saw and the completeness it reported. */
type Update = { ids: string[]; completeness: QueryResult.Completeness };

/** Subscribes and records every notification, so a test asserts how many a write produced. */
const recordUpdates = <T extends Entity.Unknown>(query: QueryResult.QueryResult<T>): Update[] => {
  const updates: Update[] = [];
  const unsubscribe = query.subscribe((result) => {
    updates.push({ ids: ids(result.results), completeness: result.completeness });
  });
  onTestFinished(unsubscribe);
  return updates;
};

const ids = (objects: readonly Entity.Unknown[]): string[] => objects.map((object) => object.id);

/** Answers the index source has integrated, including re-runs that left its result unchanged. */
const indexAnswers = (query: QueryResult.QueryResult<unknown>): number =>
  query.sources.find((source) => source.source === 'index')?.answers ?? 0;

/** Pushes local writes through the host index and waits for the live query's next index answer. */
const waitForIndexAnswer = async (
  db: EchoDatabase,
  query: QueryResult.QueryResult<unknown>,
  { secondaryIndexes = false }: { secondaryIndexes?: boolean } = {},
): Promise<void> => {
  const before = indexAnswers(query);
  await db.flush({ indexes: true, secondaryIndexes });
  await expect.poll(() => indexAnswers(query), { timeout: 5_000 }).toBeGreaterThan(before);
};

const waitForCompleteness = async (
  query: QueryResult.QueryResult<unknown>,
  completeness: QueryResult.Completeness,
): Promise<void> => {
  await expect.poll(() => query.completeness, { timeout: 5_000 }).toBe(completeness);
};

const person = (props: Partial<Pick<TestSchema.Person, 'name' | 'username' | 'age'>>) =>
  Obj.make(TestSchema.Person, props);

describe('synchronous query propagation', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  const openDatabase = async (): Promise<EchoDatabase> => {
    const peer = await builder.createPeer({ types: [TestSchema.Person, TestSchema.Task] });
    return peer.createDatabase();
  };

  describe('local writes reach subscribers before the write returns', () => {
    test('each add notifies once, before it returns, and the index re-run adds nothing', async () => {
      const db = await openDatabase();
      db.add(person({ name: 'ada' }));
      await db.flush({ indexes: true });

      const query = db.query(Filter.type(TestSchema.Person));
      const updates = recordUpdates(query);
      await waitForCompleteness(query, 'complete');
      const baseline = updates.length;

      const added: string[] = [];
      for (const name of ['grace', 'barbara', 'frances']) {
        const object = db.add(person({ name }));
        added.push(object.id);
        expect(ids(query.results)).toContain(object.id);
        expect(updates).toHaveLength(baseline + added.length);
        expect(updates.at(-1)?.ids).toEqual(ids(query.results));
      }
      expect(query.completeness).toBe('complete');

      await waitForIndexAnswer(db, query);
      expect(updates).toHaveLength(baseline + added.length);
      expect(ids(query.results)).toEqual(expect.arrayContaining(added));
    });

    test('the first write after subscribe notifies before anything has read the results', async () => {
      const db = await openDatabase();
      await db.flush({ indexes: true });

      const query = db.query(Filter.type(TestSchema.Person));
      const updates = recordUpdates(query);
      const added = db.add(person({ name: 'ada' }));
      expect(updates).toHaveLength(1);
      expect(updates[0].ids).toEqual([added.id]);
    });

    test('an edit that disqualifies an object removes it before the edit returns, and the index does not bring it back', async () => {
      const db = await openDatabase();
      const alice = db.add(person({ name: 'alice' }));
      db.add(person({ name: 'bob' }));
      await db.flush({ indexes: true });

      const query = db.query(Filter.type(TestSchema.Person, { name: 'alice' }));
      const updates = recordUpdates(query);
      await waitForCompleteness(query, 'complete');
      expect(ids(query.results)).toEqual([alice.id]);
      const baseline = updates.length;

      Obj.update(alice, (alice) => {
        alice.name = 'alicia';
      });
      expect(query.results).toEqual([]);
      expect(updates).toHaveLength(baseline + 1);
      expect(updates.at(-1)?.ids).toEqual([]);

      await waitForIndexAnswer(db, query);
      expect(query.results).toEqual([]);
      expect(updates).toHaveLength(baseline + 1);
    });

    test('an edit that qualifies an object adds it before the edit returns', async () => {
      const db = await openDatabase();
      const bob = db.add(person({ name: 'bob' }));
      await db.flush({ indexes: true });

      const query = db.query(Filter.type(TestSchema.Person, { name: 'alice' }));
      const updates = recordUpdates(query);
      await waitForCompleteness(query, 'complete');
      const baseline = updates.length;

      Obj.update(bob, (bob) => {
        bob.name = 'alice';
      });
      expect(ids(query.results)).toEqual([bob.id]);
      expect(updates).toHaveLength(baseline + 1);

      await waitForIndexAnswer(db, query);
      expect(ids(query.results)).toEqual([bob.id]);
      expect(updates).toHaveLength(baseline + 1);
    });

    test('a removal leaves the result before remove returns', async () => {
      const db = await openDatabase();
      const ada = db.add(person({ name: 'ada' }));
      const grace = db.add(person({ name: 'grace' }));
      await db.flush({ indexes: true });

      const query = db.query(Filter.type(TestSchema.Person));
      const updates = recordUpdates(query);
      await waitForCompleteness(query, 'complete');
      const baseline = updates.length;

      db.remove(ada);
      expect(ids(query.results)).toEqual([grace.id]);
      expect(updates).toHaveLength(baseline + 1);

      await waitForIndexAnswer(db, query);
      expect(ids(query.results)).toEqual([grace.id]);
      expect(updates).toHaveLength(baseline + 1);
    });

    test('an edit to a property the filter does not read notifies nobody', async () => {
      const db = await openDatabase();
      const alice = db.add(person({ name: 'alice', age: 30 }));
      await db.flush({ indexes: true });

      const query = db.query(Filter.type(TestSchema.Person, { name: 'alice' }));
      const updates = recordUpdates(query);
      await waitForCompleteness(query, 'complete');
      const baseline = updates.length;

      Obj.update(alice, (alice) => {
        alice.age = 31;
      });
      expect(updates).toHaveLength(baseline);

      await waitForIndexAnswer(db, query);
      expect(updates).toHaveLength(baseline);
      expect(ids(query.results)).toEqual([alice.id]);
    });

    test('a write to another type notifies nobody', async () => {
      const db = await openDatabase();
      db.add(person({ name: 'ada' }));
      await db.flush({ indexes: true });

      const query = db.query(Filter.type(TestSchema.Person));
      const updates = recordUpdates(query);
      await waitForCompleteness(query, 'complete');
      const baseline = updates.length;

      db.add(Obj.make(TestSchema.Task, { title: 'unrelated' }));
      expect(updates).toHaveLength(baseline);
      expect(query.completeness).toBe('complete');

      // A matching write behind it is a marker: anything the unrelated write caused late has arrived by the
      // time the index answers the marker, so the count settles at exactly one more.
      const marker = db.add(person({ name: 'marker' }));
      await waitForIndexAnswer(db, query);
      expect(updates).toHaveLength(baseline + 1);
      expect(ids(query.results)).toContain(marker.id);
    });

    test('one update that leaves and re-enters the filter notifies nobody', async () => {
      const db = await openDatabase();
      const alice = db.add(person({ name: 'alice' }));
      await db.flush({ indexes: true });

      const query = db.query(Filter.type(TestSchema.Person, { name: 'alice' }));
      const updates = recordUpdates(query);
      await waitForCompleteness(query, 'complete');
      const baseline = updates.length;

      // The intermediate state is never committed on its own, so no subscriber may see it.
      Obj.update(alice, (alice) => {
        alice.name = 'someone else';
        alice.age = 40;
        alice.name = 'alice';
      });
      expect(updates).toHaveLength(baseline);
      expect(ids(query.results)).toEqual([alice.id]);
    });

    test('objects enter an unordered query in id order, not the order they were added', async () => {
      const db = await openDatabase();
      const [lower, higher] = [EntityId.random(), EntityId.random()];
      const query = db.query(Filter.type(TestSchema.Person));
      recordUpdates(query);

      db.add(Obj.make(TestSchema.Person, { id: higher, name: 'higher' }));
      db.add(Obj.make(TestSchema.Person, { id: lower, name: 'lower' }));
      expect(ids(query.results)).toEqual([lower, higher]);

      // An equivalent query computed from scratch agrees, as does the live one once the index answers.
      expect(ids(await db.query(Filter.and(Filter.type(TestSchema.Person))).run())).toEqual([lower, higher]);
      await waitForIndexAnswer(db, query);
      expect(ids(query.results)).toEqual([lower, higher]);
    });

    test('a by-id query is complete and current without waiting for the index', async () => {
      const db = await openDatabase();
      const ada = db.add(person({ name: 'ada' }));
      await db.flush({ indexes: true });

      const query = db.query(Filter.id(ada.id));
      const updates = recordUpdates(query);
      expect(query.completeness).toBe('complete');
      expect(ids(query.results)).toEqual([ada.id]);

      db.remove(ada);
      expect(query.results).toEqual([]);
      expect(updates).toHaveLength(1);
      expect(query.completeness).toBe('complete');
    });
  });

  describe('index-served windows', () => {
    // Five members, named so the ascending window of three is [a, b, c].
    const openWindow = async () => {
      const db = await openDatabase();
      const members = Object.fromEntries(
        ['a', 'b', 'c', 'd', 'e'].map((name) => [name, db.add(person({ name, username: 'member' }))]),
      );
      await db.flush({ indexes: true });

      const query = db.query(
        Query.select(Filter.type(TestSchema.Person, { username: 'member' }))
          .orderBy(Order.property('name', 'asc'))
          .limit(3),
      );
      const updates = recordUpdates(query);
      await waitForCompleteness(query, 'complete');
      expect(ids(query.results)).toEqual([members.a.id, members.b.id, members.c.id]);
      return { db, query, updates, members };
    };

    test('a disqualified object leaves the window before the edit returns; the index refills it', async () => {
      const { db, query, updates, members } = await openWindow();
      const baseline = updates.length;

      Obj.update(members.b, (member) => {
        member.username = 'former';
      });
      expect(ids(query.results)).toEqual([members.a.id, members.c.id]);
      expect(updates).toHaveLength(baseline + 1);
      expect(query.completeness).toBe('stale');

      await waitForIndexAnswer(db, query);
      expect(ids(query.results)).toEqual([members.a.id, members.c.id, members.d.id]);
      expect(updates).toHaveLength(baseline + 2);
      expect(query.completeness).toBe('complete');
    });

    test('a new match that sorts inside the window enters it before the add returns', async () => {
      const { db, query, updates, members } = await openWindow();
      const baseline = updates.length;

      const first = db.add(person({ name: '0', username: 'member' }));
      expect(ids(query.results)).toEqual([first.id, members.a.id, members.b.id]);
      expect(updates).toHaveLength(baseline + 1);

      await waitForIndexAnswer(db, query);
      expect(ids(query.results)).toEqual([first.id, members.a.id, members.b.id]);
      expect(updates).toHaveLength(baseline + 1);
    });

    test('a window the index answered empty admits a new match before the add returns', async () => {
      const db = await openDatabase();
      await db.flush({ indexes: true });
      const query = db.query(
        Query.select(Filter.type(TestSchema.Person, { username: 'member' }))
          .orderBy(Order.property('name', 'asc'))
          .limit(3),
      );
      const updates = recordUpdates(query);
      await waitForCompleteness(query, 'complete');
      expect(query.results).toEqual([]);
      const baseline = updates.length;

      const first = db.add(person({ name: 'a', username: 'member' }));
      expect(ids(query.results)).toEqual([first.id]);
      expect(updates).toHaveLength(baseline + 1);
    });

    test('a new match that sorts after the window does not notify', async () => {
      const { db, query, updates, members } = await openWindow();
      const baseline = updates.length;

      db.add(person({ name: 'z', username: 'member' }));
      expect(ids(query.results)).toEqual([members.a.id, members.b.id, members.c.id]);
      expect(updates).toHaveLength(baseline);

      await waitForIndexAnswer(db, query);
      expect(updates).toHaveLength(baseline);
    });
  });

  describe('index-backed objects', () => {
    // Reopened from disk, so query results are backed by the index's JSON and hold no document.
    const openReloaded = async (populate: (db: EchoDatabase) => void) => {
      const peer = await builder.createPeer({ types: [TestSchema.Person, TestSchema.Task] });
      const initialDb = await peer.createDatabase();
      populate(initialDb);
      await initialDb.flush({ indexes: true, secondaryIndexes: true });
      await peer.reload();
      const db = await peer.openLastDatabase();
      invariant(db instanceof DatabaseImpl);
      return db;
    };

    const hasDocument = (db: DatabaseImpl, id: string): boolean =>
      db.getObjectCoreById(id, { load: false })?.docHandle !== undefined;

    test('an edit that disqualifies an index-backed object removes it before the edit returns', async () => {
      const db = await openReloaded((db) => {
        db.add(person({ name: 'alice' }));
        db.add(person({ name: 'bob' }));
      });
      const query = db.query(Filter.type(TestSchema.Person, { name: 'alice' }));
      const updates = recordUpdates(query);
      await waitForCompleteness(query, 'complete');
      const [alice] = query.results;
      expect(alice?.name).toBe('alice');
      expect(hasDocument(db, alice.id)).toBe(false);
      const baseline = updates.length;

      Obj.update(alice, (alice) => {
        alice.name = 'alicia';
      });
      expect(hasDocument(db, alice.id)).toBe(true);
      expect(query.results).toEqual([]);
      expect(updates).toHaveLength(baseline + 1);

      await waitForIndexAnswer(db, query);
      expect(query.results).toEqual([]);
      expect(updates).toHaveLength(baseline + 1);
    });

    test('an edit that qualifies an index-backed object adds it before the edit returns', async () => {
      const db = await openReloaded((db) => {
        db.add(person({ name: 'bob' }));
      });
      const [bob] = await db.query(Filter.type(TestSchema.Person)).run();
      expect(hasDocument(db, bob.id)).toBe(false);
      const query = db.query(Filter.type(TestSchema.Person, { name: 'alice' }));
      const updates = recordUpdates(query);
      await waitForCompleteness(query, 'complete');
      expect(query.results).toEqual([]);
      const baseline = updates.length;

      Obj.update(bob, (bob) => {
        bob.name = 'alice';
      });
      expect(ids(query.results)).toEqual([bob.id]);
      expect(updates).toHaveLength(baseline + 1);

      await waitForIndexAnswer(db, query);
      expect(ids(query.results)).toEqual([bob.id]);
      expect(updates).toHaveLength(baseline + 1);
    });

    test('a window of index-backed objects drops a disqualified member before the edit returns', async () => {
      const db = await openReloaded((db) => {
        for (const name of ['a', 'b', 'c', 'd']) {
          db.add(person({ name, username: 'member' }));
        }
      });
      const query = db.query(
        Query.select(Filter.type(TestSchema.Person, { username: 'member' }))
          .orderBy(Order.property('name', 'asc'))
          .limit(3),
      );
      const updates = recordUpdates(query);
      await waitForCompleteness(query, 'complete');
      const [first, second, third] = query.results;
      expect([first, second, third].map((member) => member?.name)).toEqual(['a', 'b', 'c']);
      const baseline = updates.length;

      Obj.update(second, (second) => {
        second.username = 'former';
      });
      expect(ids(query.results)).toEqual([first.id, third.id]);
      expect(updates).toHaveLength(baseline + 1);

      await waitForIndexAnswer(db, query);
      expect(query.results.map((member) => member.name)).toEqual(['a', 'c', 'd']);
      expect(updates).toHaveLength(baseline + 2);
    });
  });

  describe('subscriber writes', () => {
    test('a write made from a notification is a separate commit with its own notification', async () => {
      const db = await openDatabase();
      await db.flush({ indexes: true });

      const query = db.query(Filter.type(TestSchema.Person, { name: 'alice' }));
      const seen: string[][] = [];
      let armed = false;
      let echoed: Entity.Unknown | undefined;
      const unsubscribe = query.subscribe((result) => {
        if (!armed) {
          return;
        }
        seen.push(ids(result.results));
        echoed ??= db.add(person({ name: 'alice' }));
      });
      onTestFinished(unsubscribe);
      await waitForCompleteness(query, 'complete');

      armed = true;
      const first = db.add(person({ name: 'alice' }));
      expect(echoed).toBeDefined();
      const echoedId = echoed?.id;
      expect(echoedId).toBeDefined();
      expect(seen).toEqual([[first.id], [first.id, echoedId]]);

      await waitForIndexAnswer(db, query);
      expect(seen).toHaveLength(2);
    });
  });

  describe('completeness', () => {
    test('a type query is local-only until the index answers, then complete', async () => {
      const db = await openDatabase();
      db.add(person({ name: 'ada' }));
      await db.flush({ indexes: true });

      const query = db.query(Filter.type(TestSchema.Person));
      recordUpdates(query);
      expect(query.completeness).toBe('local-only');
      expect(query.results).toHaveLength(1);
      await waitForCompleteness(query, 'complete');
    });

    test('a text query is pending until the index answers, and stale after a local write until it answers again', async () => {
      const db = await openDatabase();
      db.add(person({ name: 'lovelace' }));
      // Full text is a secondary index, which a plain index flush does not wait for.
      await db.flush({ indexes: true, secondaryIndexes: true });

      const query = db.query(Query.select(Filter.text('lovelace', { type: 'full-text' })));
      const updates = recordUpdates(query);
      expect(query.completeness).toBe('pending');
      await waitForCompleteness(query, 'complete');
      expect(query.results).toHaveLength(1);
      const baseline = updates.length;

      db.add(person({ name: 'lovelace junior' }));
      expect(query.completeness).toBe('stale');
      expect(updates).toHaveLength(baseline);

      // A re-run driven by the primary index can answer before full text has caught up, so wait for the match.
      await db.flush({ indexes: true, secondaryIndexes: true });
      await expect.poll(() => query.results.length, { timeout: 5_000 }).toBe(2);
      expect(query.completeness).toBe('complete');
      expect(updates).toHaveLength(baseline + 1);
    });

    test('a registry query is complete synchronously', async () => {
      const db = await openDatabase();
      const query = db.query(Query.select(Filter.everything()).from(Scope.registry()));
      recordUpdates(query);
      expect(query.completeness).toBe('complete');
      expect(query.results.length).toBeGreaterThan(0);
    });
  });
});

describe('Query.characteristics', () => {
  const branches = (query: Query.Any) => Query.characteristics(query).branches;

  test('by id is local-complete and revalidated per entry', ({ expect }) => {
    const [branch] = branches(Query.select(Filter.id(EntityId.make('01J00000000000000000000000'))));
    expect(branch).toMatchObject({ class: 'local-complete', selection: 'id', revalidation: 'entry' });
  });

  test('type and property filters are local-partial and revalidated per entry', ({ expect }) => {
    const [branch] = branches(Query.select(Filter.type(TestSchema.Person, { name: 'ada' })));
    expect(branch).toMatchObject({
      class: 'local-partial',
      selection: 'type',
      predicates: 'local',
      revalidation: 'entry',
      traversal: 0,
    });
  });

  test('text search is remote-only and never revalidated', ({ expect }) => {
    const [branch] = branches(Query.select(Filter.text('ada')));
    expect(branch).toMatchObject({ class: 'remote-only', selection: 'text', revalidation: 'none' });
  });

  test('a text predicate nested anywhere in the filter disables revalidation', ({ expect }) => {
    const [branch] = branches(
      Query.select(
        Filter.and(Filter.type(TestSchema.Person), Filter.or(Filter.props({ name: 'ada' }), Filter.text('grace'))),
      ),
    );
    expect(branch).toMatchObject({ class: 'remote-only', predicates: 'index', revalidation: 'none' });
  });

  test('a timestamp filter is remote-only', ({ expect }) => {
    const [branch] = branches(Query.select(Filter.updated({ after: new Date(0) })));
    expect(branch).toMatchObject({ class: 'remote-only', revalidation: 'none' });
  });

  test('traversals are local-partial and revalidated by path', ({ expect }) => {
    const [reference] = branches(Query.select(Filter.type(TestSchema.Person)).reference('employer'));
    expect(reference).toMatchObject({ class: 'local-partial', revalidation: 'path', traversal: 1 });

    const [children] = branches(Query.select(Filter.type(TestSchema.Person)).children().children());
    expect(children).toMatchObject({ revalidation: 'path', traversal: 2 });
  });

  test('order and limit make a branch local-revalidating with a window', ({ expect }) => {
    const [branch] = branches(
      Query.select(Filter.type(TestSchema.Person)).orderBy(Order.property('name', 'asc')).limit(10),
    );
    expect(branch).toMatchObject({
      class: 'local-revalidating',
      revalidation: 'entry',
      window: { order: 'local-property', limit: 10 },
    });

    const [ranked] = branches(Query.select(Filter.type(TestSchema.Person)).orderBy(Order.rank()).limit(10));
    expect(ranked).toMatchObject({ class: 'local-revalidating', window: { order: 'index', limit: 10 } });
  });

  test('aggregates revalidate by members or manifest; timestamp keys are remote-only', ({ expect }) => {
    const [members] = branches(
      Query.select(Filter.type(TestSchema.Person)).aggregate({
        name: Aggregate.group('name'),
        items: Aggregate.items(),
      }),
    );
    expect(members).toMatchObject({ aggregate: 'members', revalidation: 'manifest' });

    const [scalar] = branches(Query.select(Filter.type(TestSchema.Person)).aggregate({ count: Aggregate.count() }));
    expect(scalar).toMatchObject({ aggregate: 'scalar', revalidation: 'manifest' });

    const [activity] = branches(
      Query.select(Filter.type(TestSchema.Person)).aggregate({
        day: Aggregate.updated('day'),
        count: Aggregate.count(),
      }),
    );
    expect(activity).toMatchObject({ aggregate: 'index', class: 'remote-only' });
  });

  test('a union keeps one record per branch', ({ expect }) => {
    const characteristics = Query.characteristics(
      Query.all(Query.select(Filter.type(TestSchema.Person)), Query.select(Filter.text('ada'))),
    );
    expect(characteristics.branches.map((branch) => branch.class)).toEqual(['local-partial', 'remote-only']);
    expect(characteristics).toMatchObject({ synchronous: true, remote: true, revalidation: 'none' });
  });

  test('a local registry scope is local-complete; a remote registry scope is unsupported', ({ expect }) => {
    const [local] = branches(Query.select(Filter.everything()).from(Scope.registry()));
    expect(local).toMatchObject({ class: 'local-complete', revalidation: 'none' });

    const [traversed] = branches(Query.select(Filter.everything()).from(Scope.registry()).reference('employer'));
    expect(traversed).toMatchObject({ class: 'unsupported' });

    const [remote] = branches(Query.select(Filter.everything()).from(Scope.registry('remote')));
    expect(remote).toMatchObject({ class: 'unsupported' });
  });

  test('a feed scope is remote-only', ({ expect }) => {
    const [branch] = branches(
      Query.select(Filter.everything()).from(
        Scope.feed(EID.make({ entityId: EntityId.make('01J00000000000000000000000') })),
      ),
    );
    expect(branch).toMatchObject({ class: 'remote-only' });
  });

  test('a query is synchronous exactly when some branch has a local contribution', ({ expect }) => {
    expect(Query.characteristics(Query.select(Filter.type(TestSchema.Person)))).toMatchObject({
      synchronous: true,
      remote: true,
      revalidation: 'entry',
    });
    expect(Query.characteristics(Query.select(Filter.text('ada')))).toMatchObject({
      synchronous: false,
      remote: true,
    });
    expect(Query.characteristics(Query.select(Filter.everything()).from(Scope.registry()))).toMatchObject({
      synchronous: true,
      remote: false,
    });
  });
});
