//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import { pipe } from 'effect/Function';
import * as Option from 'effect/Option';
import { afterEach, beforeEach, describe, test, vi } from 'vitest';

import { Event } from '@dxos/async';
import { Database, Feed, Filter, Obj, Order, Query, Ref } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { EffectEx } from '@dxos/effect';
import { EID, PublicKey } from '@dxos/keys';
import { FeedProtocol } from '@dxos/protocols';

import { EchoTestBuilder } from '../testing';

describe('Feed', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('remove items from a feed', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
    const db = await peer.createDatabase();
    const testLayer = Database.layer(db);

    await Effect.gen(function* () {
      const feed = yield* Database.add(Feed.make({ name: 'removable' }));

      const alice = Obj.make(TestSchema.Person, { name: 'alice' });
      const bob = Obj.make(TestSchema.Person, { name: 'bob' });
      yield* Feed.append(feed, [alice, bob]);

      yield* Feed.remove(feed, [alice]);
    }).pipe(Effect.provide(testLayer), EffectEx.runAndForwardErrors);
  });

  test('query feeds by kind', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [Feed.Feed] });
    const db = await peer.createDatabase();
    const testLayer = Database.layer(db);

    await Effect.gen(function* () {
      yield* Database.add(Feed.make({ name: 'notifications', kind: 'org.dxos.plugin.notifications.v1' }));
      yield* Database.add(Feed.make({ name: 'messages', kind: 'org.dxos.plugin.messages.v1' }));
      yield* Database.add(Feed.make({ name: 'other-notifications', kind: 'org.dxos.plugin.notifications.v1' }));

      yield* Database.flush();

      const notificationFeeds = yield* Database.query(
        Filter.type(Feed.Feed, { kind: 'org.dxos.plugin.notifications.v1' }),
      ).run;
      expect(notificationFeeds).toHaveLength(2);
      expect(notificationFeeds.map((feed) => feed.name).sort()).toEqual(['notifications', 'other-notifications']);
    }).pipe(Effect.provide(testLayer), EffectEx.runAndForwardErrors);
  });

  test('query items in a feed', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
    const db = await peer.createDatabase();
    const testLayer = Database.layer(db);

    await Effect.gen(function* () {
      const feed = yield* Database.add(Feed.make({ name: 'queryable' }));

      const alice = Obj.make(TestSchema.Person, { name: 'alice' });
      const bob = Obj.make(TestSchema.Person, { name: 'bob' });
      yield* Feed.append(feed, [alice, bob]);

      const results = yield* Feed.query(feed, Filter.type(TestSchema.Person)).run;
      expect(results).toHaveLength(2);
      expect(results.map((item: any) => item.name).sort()).toEqual(['alice', 'bob']);
    }).pipe(Effect.provide(testLayer), EffectEx.runAndForwardErrors);
  });

  test('query.run returns all results', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
    const db = await peer.createDatabase();
    const testLayer = Database.layer(db);

    await Effect.gen(function* () {
      const feed = yield* Database.add(Feed.make({ name: 'runnable' }));

      yield* Feed.append(feed, [
        Obj.make(TestSchema.Person, { name: 'alice' }),
        Obj.make(TestSchema.Person, { name: 'bob' }),
      ]);

      const results = yield* Feed.query(feed, Filter.type(TestSchema.Person)).run;
      expect(results.map((person) => person.name).sort()).toEqual(['alice', 'bob']);
    }).pipe(Effect.provide(testLayer), EffectEx.runAndForwardErrors);
  });

  test('query.first returns the first result as an Option', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
    const db = await peer.createDatabase();
    const testLayer = Database.layer(db);

    await Effect.gen(function* () {
      const feed = yield* Database.add(Feed.make({ name: 'first' }));

      const empty = yield* Feed.query(feed, Filter.type(TestSchema.Person)).first;
      expect(Option.isNone(empty)).toBe(true);

      yield* Feed.append(feed, [Obj.make(TestSchema.Person, { name: 'alice' })]);

      const first = yield* Feed.query(feed, Filter.type(TestSchema.Person)).first;
      expect(Option.isSome(first)).toBe(true);
      expect(Option.getOrThrow(first).name).toBe('alice');
    }).pipe(Effect.provide(testLayer), EffectEx.runAndForwardErrors);
  });

  test('query composes data-last with pipe', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
    const db = await peer.createDatabase();
    const testLayer = Database.layer(db);

    await Effect.gen(function* () {
      const feed = yield* Database.add(Feed.make({ name: 'curried' }));

      yield* Feed.append(feed, [
        Obj.make(TestSchema.Person, { name: 'alice' }),
        Obj.make(TestSchema.Person, { name: 'bob' }),
      ]);

      const results = yield* pipe(feed, Feed.query(Filter.type(TestSchema.Person))).run;
      expect(results.map((person) => person.name).sort()).toEqual(['alice', 'bob']);
    }).pipe(Effect.provide(testLayer), EffectEx.runAndForwardErrors);
  });

  test('feed objects have database returned with Obj.getDatabase', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
    const db = await peer.createDatabase();
    const testLayer = Database.layer(db);

    await Effect.gen(function* () {
      const feed = yield* Database.add(Feed.make({ name: 'database-test' }));

      const alice = Obj.make(TestSchema.Person, { name: 'alice' });
      yield* Feed.append(feed, [alice]);

      const results = yield* Feed.query(feed, Filter.type(TestSchema.Person)).run;
      expect(results).toHaveLength(1);

      const feedObject = results[0];
      const objDb = Obj.getDatabase(feedObject);
      expect(objDb).toBeDefined();
      expect(objDb?.spaceId).toEqual(db.spaceId);
    }).pipe(Effect.provide(testLayer), EffectEx.runAndForwardErrors);
  });

  test('getParent returns Feed object for appended items', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
    const db = await peer.createDatabase();
    const testLayer = Database.layer(db);

    await Effect.gen(function* () {
      const feed = yield* Database.add(Feed.make({ name: 'parent-test' }));

      const alice = Obj.make(TestSchema.Person, { name: 'alice' });
      yield* Feed.append(feed, [alice]);

      const parent = Obj.getParent(alice);
      expect(parent).toBeDefined();
      expect(parent).toBe(feed);
    }).pipe(Effect.provide(testLayer), EffectEx.runAndForwardErrors);
  });

  test('getParent returns Feed object for queried items', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
    const db = await peer.createDatabase();
    const testLayer = Database.layer(db);

    await Effect.gen(function* () {
      const feed = yield* Database.add(Feed.make({ name: 'parent-query-test' }));

      const alice = Obj.make(TestSchema.Person, { name: 'alice' });
      const bob = Obj.make(TestSchema.Person, { name: 'bob' });
      yield* Feed.append(feed, [alice, bob]);

      const results = yield* Feed.query(feed, Filter.type(TestSchema.Person)).run;
      expect(results).toHaveLength(2);
      for (const item of results) {
        const parent = Obj.getParent(item);
        expect(parent).toBeDefined();
        expect(parent).toBe(feed);
      }
    }).pipe(Effect.provide(testLayer), EffectEx.runAndForwardErrors);
  });

  test('query.subscribe fires with current results when fire: true', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
    const db = await peer.createDatabase();
    const testLayer = Database.layer(db);

    await Effect.gen(function* () {
      const feed = yield* Database.add(Feed.make({ name: 'subscribable' }));

      const alice = Obj.make(TestSchema.Person, { name: 'alice' });
      const bob = Obj.make(TestSchema.Person, { name: 'bob' });
      yield* Feed.append(feed, [alice, bob]);

      const queryResult = yield* Feed.query(feed, Filter.type(TestSchema.Person));
      const called = new Event();
      const calledOnce = called.waitForCount(1);
      const unsubscribe = queryResult.subscribe(() => called.emit(), { fire: true });

      yield* Effect.promise(() => calledOnce);
      expect(queryResult.results).toHaveLength(2);
      expect(queryResult.results.map((person) => person.name).sort()).toEqual(['alice', 'bob']);
      unsubscribe();
    }).pipe(Effect.provide(testLayer), EffectEx.runAndForwardErrors);
  });

  test('query.subscribe fires when items are appended', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
    const db = await peer.createDatabase();
    const testLayer = Database.layer(db);

    await Effect.gen(function* () {
      const feed = yield* Database.add(Feed.make({ name: 'reactive' }));

      const alice = Obj.make(TestSchema.Person, { name: 'alice' });
      yield* Feed.append(feed, [alice]);

      const queryResult = yield* Feed.query(feed, Filter.type(TestSchema.Person));
      const called = new Event();
      const calledOnce = called.waitForCount(1);
      const unsubscribe = queryResult.subscribe(() => called.emit());

      const bob = Obj.make(TestSchema.Person, { name: 'bob' });
      yield* Feed.append(feed, [bob]);

      yield* Effect.promise(() => calledOnce);
      expect(queryResult.results).toHaveLength(2);
      expect(queryResult.results.map((person) => person.name).sort()).toEqual(['alice', 'bob']);
      unsubscribe();
    }).pipe(Effect.provide(testLayer), EffectEx.runAndForwardErrors);
  });

  test('sync flushes the feed without throwing', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
    const db = await peer.createDatabase();
    const testLayer = Database.layer(db);

    await Effect.gen(function* () {
      const feed = yield* Database.add(Feed.make({ name: 'syncable' }));

      const alice = Obj.make(TestSchema.Person, { name: 'alice' });
      yield* Feed.append(feed, [alice]);
      yield* Feed.sync(feed);
      yield* Feed.sync(feed, { shouldPush: false });
      yield* Feed.sync(feed, { shouldPull: false });

      const results = yield* Feed.query(feed, Filter.type(TestSchema.Person)).run;
      expect(results).toHaveLength(1);
    }).pipe(Effect.provide(testLayer), EffectEx.runAndForwardErrors);
  });

  // TODO(wittjosiah): Implement when queue retention is supported.
  test.todo('setRetention configures feed retention policy');

  test('Ref.make on a feed item stores a Queue DXN and does not leak into space.db', async ({ expect }) => {
    await using peer = await builder.createPeer({
      types: [Feed.Feed, TestSchema.Person, TestSchema.Container],
    });
    const db = await peer.createDatabase();
    const testLayer = Database.layer(db);

    await Effect.gen(function* () {
      const feed = yield* Database.add(Feed.make({ name: 'posts' }));

      const post = Obj.make(TestSchema.Person, { name: 'alice' });
      yield* Feed.append(feed, [post]);

      // Re-query to obtain a queue-decoded proxy (cross-db ref resolution path).
      const items = yield* Feed.query(feed, Filter.type(TestSchema.Person)).run;
      expect(items).toHaveLength(1);
      const queuePost = items[0];

      // Reference the queue item from a container that lives in space.db.
      const container = yield* Database.add(Obj.make(TestSchema.Container, {}));
      Obj.update(container, (container) => {
        const mutable = container as Obj.Mutable<typeof container>;
        mutable.objects = [Ref.make(queuePost)];
      });
      yield* Database.flush();

      // The stored ref must be a queue EID — not a synthesized ECHO URI.
      const ref = container.objects![0];
      expect(EID.isEID(ref.uri)).toBe(true);
      expect(EID.getEntityId(EID.parse(ref.uri))).toBe((queuePost as any).id);

      // The queue item must NOT have been added to space.db.
      const dbResults = yield* Database.query(Filter.type(TestSchema.Person)).run;
      expect(dbResults).toHaveLength(0);

      // The ref must still resolve to the queue item.
      const resolved = yield* Effect.promise(() => ref.load());
      expect((resolved as any).name).toBe('alice');
    }).pipe(Effect.provide(testLayer), EffectEx.runAndForwardErrors);
  });

  test('ref.load resolves queue item when feed queue is not in knownQueues', async ({ expect }) => {
    const [spaceKey] = PublicKey.randomSequence();
    await using peer = await builder.createPeer({
      types: [Feed.Feed, TestSchema.Person, TestSchema.Container],
    });
    await using db1 = await peer.createDatabase(spaceKey);
    const testLayer1 = Database.layer(db1);

    let postRefUri = '';
    let containerId = '';
    await Effect.gen(function* () {
      const feed = yield* Database.add(Feed.make({ name: 'posts' }));
      const post = Obj.make(TestSchema.Person, { name: 'alice' });
      yield* Feed.append(feed, [post]);

      const container = yield* Database.add(Obj.make(TestSchema.Container, {}));
      Obj.update(container, (container) => {
        const mutable = container as Obj.Mutable<typeof container>;
        mutable.objects = [Ref.make(post)];
      });
      postRefUri = container.objects![0]!.uri;
      containerId = container.id;
      yield* Database.flush({ indexes: true });
    }).pipe(Effect.provide(testLayer1), EffectEx.runAndForwardErrors);

    // Fresh client: empty feed-handle cache (exercises cold cross-db ref resolution).
    await using client2 = await peer.createClient();
    await using db2 = await peer.openDatabase(spaceKey, db1.rootUrl!, { client: client2 });
    expect([...db2._knownFeedHandles()]).toHaveLength(0);

    const [container] = await db2.query(Filter.id(containerId)).run();
    const postRef = container.objects![0]!;
    expect(postRef.uri).toBe(postRefUri);

    const resolved = await postRef.load();
    expect((resolved as TestSchema.Person).name).toBe('alice');

    const postId = EID.getEntityId(postRef.uri)!;
    const indexed = await db2.query(Query.select(Filter.id(postId)).from(db2, { includeFeeds: true })).run();
    expect(indexed).toHaveLength(1);
    expect((indexed[0] as TestSchema.Person).name).toBe('alice');

    const traversed = await db2
      .query(Query.select(Filter.id(containerId)).reference('objects').from(db2, { includeFeeds: true }))
      .run();
    expect(traversed).toHaveLength(1);
    expect((traversed[0] as TestSchema.Person).name).toBe('alice');
  });

  describe('windowed queries (lazy loading)', () => {
    const appendPeople = function* (feed: Feed.Feed, count: number) {
      for (let i = 0; i < count; i++) {
        yield* Feed.append(feed, [Obj.make(TestSchema.Person, { name: `person-${i}` })]);
      }
    };

    test('orderBy(natural desc).limit(n) returns the newest n items, newest first', async ({ expect }) => {
      await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
      const db = await peer.createDatabase();
      const testLayer = Database.layer(db);

      await Effect.gen(function* () {
        const feed = yield* Database.add(Feed.make({ name: 'windowed-head' }));
        yield* appendPeople(feed, 10);

        const results = yield* Feed.query(
          feed,
          Query.select(Filter.type(TestSchema.Person)).orderBy(Order.natural('desc')).limit(3),
        ).run;

        expect(results.map((person) => person.name)).toEqual(['person-9', 'person-8', 'person-7']);
      }).pipe(Effect.provide(testLayer), EffectEx.runAndForwardErrors);
    });

    test('skip(n).limit(m) walks toward older items without reloading the head', async ({ expect }) => {
      await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
      const db = await peer.createDatabase();
      const testLayer = Database.layer(db);

      await Effect.gen(function* () {
        const feed = yield* Database.add(Feed.make({ name: 'windowed-page' }));
        yield* appendPeople(feed, 10);

        const older = yield* Feed.query(
          feed,
          Query.select(Filter.type(TestSchema.Person)).orderBy(Order.natural('desc')).skip(3).limit(3),
        ).run;

        expect(older.map((person) => person.name)).toEqual(['person-6', 'person-5', 'person-4']);
      }).pipe(Effect.provide(testLayer), EffectEx.runAndForwardErrors);
    });

    test('returns fewer than the requested limit once the start of the feed is reached', async ({ expect }) => {
      await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
      const db = await peer.createDatabase();
      const testLayer = Database.layer(db);

      await Effect.gen(function* () {
        const feed = yield* Database.add(Feed.make({ name: 'windowed-exhausted' }));
        yield* appendPeople(feed, 5);

        const results = yield* Feed.query(
          feed,
          Query.select(Filter.type(TestSchema.Person)).orderBy(Order.natural('desc')).skip(3).limit(5),
        ).run;

        expect(results.map((person) => person.name)).toEqual(['person-1', 'person-0']);
      }).pipe(Effect.provide(testLayer), EffectEx.runAndForwardErrors);
    });

    test('windowed query stays reactive: appends at the head are reflected without a manual reload', async ({
      expect,
    }) => {
      await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
      const db = await peer.createDatabase();
      const testLayer = Database.layer(db);

      await Effect.gen(function* () {
        const feed = yield* Database.add(Feed.make({ name: 'windowed-reactive' }));
        yield* appendPeople(feed, 2);

        const queryResult = yield* Feed.query(
          feed,
          Query.select(Filter.type(TestSchema.Person)).orderBy(Order.natural('desc')).limit(5),
        );
        const called = new Event();
        // Unlike a legacy (unwindowed) query, a fresh window has no optimistic data to show
        // synchronously: the `fire: true` callback fires immediately with empty results, and a
        // second event follows once the initial async page load resolves.
        const loaded = called.waitForCount(2);
        const unsubscribe = queryResult.subscribe(() => called.emit(), { fire: true });
        yield* Effect.promise(() => loaded);
        expect(queryResult.results.map((person) => person.name)).toEqual(['person-1', 'person-0']);

        const nextCall = called.waitForCount(1);
        yield* Feed.append(feed, [Obj.make(TestSchema.Person, { name: 'person-2' })]);
        yield* Effect.promise(() => nextCall);

        expect(queryResult.results.map((person) => person.name)).toEqual(['person-2', 'person-1', 'person-0']);
        unsubscribe();
      }).pipe(Effect.provide(testLayer), EffectEx.runAndForwardErrors);
    });

    test('windowed query reflects deletes (tombstones) even for already-loaded items', async ({ expect }) => {
      await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
      const db = await peer.createDatabase();
      const testLayer = Database.layer(db);

      await Effect.gen(function* () {
        const feed = yield* Database.add(Feed.make({ name: 'windowed-delete' }));
        const alice = Obj.make(TestSchema.Person, { name: 'alice' });
        yield* Feed.append(feed, [alice]);
        yield* Feed.append(feed, [Obj.make(TestSchema.Person, { name: 'bob' })]);

        const queryResult = yield* Feed.query(
          feed,
          Query.select(Filter.type(TestSchema.Person)).orderBy(Order.natural('desc')).limit(5),
        );
        const called = new Event();
        // See the equivalent comment in the "appends at the head" test above.
        const loaded = called.waitForCount(2);
        const unsubscribe = queryResult.subscribe(() => called.emit(), { fire: true });
        yield* Effect.promise(() => loaded);
        expect(queryResult.results).toHaveLength(2);

        const nextCall = called.waitForCount(1);
        yield* Feed.remove(feed, [alice]);
        yield* Effect.promise(() => nextCall);

        expect(queryResult.results.map((person) => person.name)).toEqual(['bob']);
        unsubscribe();
      }).pipe(Effect.provide(testLayer), EffectEx.runAndForwardErrors);
    });

    test('sliding skip back toward the head recovers previously evicted newer items', async ({ expect }) => {
      await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
      const db = await peer.createDatabase();
      const testLayer = Database.layer(db);

      await Effect.gen(function* () {
        const feed = yield* Database.add(Feed.make({ name: 'windowed-bidirectional' }));
        yield* appendPeople(feed, 30);

        // Load the head first (rangeStart = 0), same as a fresh `usePaginatedQuery` mount.
        const head = yield* Feed.query(
          feed,
          Query.select(Filter.type(TestSchema.Person)).orderBy(Order.natural('desc')).limit(5),
        ).run;
        expect(head.map((person) => person.name)).toEqual([
          'person-29',
          'person-28',
          'person-27',
          'person-26',
          'person-25',
        ]);

        // Jump far toward older items -- evicts the pages covering the head off the front of the
        // window (rangeStart advances past 20).
        const older = yield* Feed.query(
          feed,
          Query.select(Filter.type(TestSchema.Person)).orderBy(Order.natural('desc')).skip(20).limit(5),
        ).run;
        expect(older.map((person) => person.name)).toEqual([
          'person-9',
          'person-8',
          'person-7',
          'person-6',
          'person-5',
        ]);

        // Slide back toward the head into the now-evicted gap (positions 5-9). This only works if
        // the window fetches newer items to recover what it dropped, rather than treating anything
        // before its current rangeStart as permanently gone.
        const recovered = yield* Feed.query(
          feed,
          Query.select(Filter.type(TestSchema.Person)).orderBy(Order.natural('desc')).skip(5).limit(5),
        ).run;
        expect(recovered.map((person) => person.name)).toEqual([
          'person-24',
          'person-23',
          'person-22',
          'person-21',
          'person-20',
        ]);

        // And all the way back to the head itself.
        const backAtHead = yield* Feed.query(
          feed,
          Query.select(Filter.type(TestSchema.Person)).orderBy(Order.natural('desc')).limit(5),
        ).run;
        expect(backAtHead.map((person) => person.name)).toEqual([
          'person-29',
          'person-28',
          'person-27',
          'person-26',
          'person-25',
        ]);
      }).pipe(Effect.provide(testLayer), EffectEx.runAndForwardErrors);
    });

    test('reaching the true end, then sliding back partway, does not get stuck refusing to load older items again', async ({
      expect,
    }) => {
      // Regression test: `#hasOlder` is a single flag set by whichever page most recently
      // confirmed/denied "more data exists beyond it". Reaching the genuine end of the feed sets
      // it false; sliding back toward the head trims that now-unneeded tail page away without
      // invalidating the flag it justified. Scrolling toward older items again then trusts the
      // stale `false` and never re-fetches, permanently undershooting from that point on -- even
      // though plenty more data exists. This doesn't require returning all the way to skip 0 (see
      // the "sliding skip back" test above for that path); trimming the tail page on any backward
      // slide is enough to go stale.
      await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
      const db = await peer.createDatabase();
      const testLayer = Database.layer(db);

      await Effect.gen(function* () {
        const feed = yield* Database.add(Feed.make({ name: 'windowed-stuck-after-end' }));
        yield* appendPeople(feed, 120);

        // Reach the true end of the feed.
        const bottom = yield* Feed.query(
          feed,
          Query.select(Filter.type(TestSchema.Person)).orderBy(Order.natural('desc')).skip(100).limit(20),
        ).run;
        expect(bottom.map((person) => person.name)).toEqual([
          'person-19',
          'person-18',
          'person-17',
          'person-16',
          'person-15',
          'person-14',
          'person-13',
          'person-12',
          'person-11',
          'person-10',
          'person-9',
          'person-8',
          'person-7',
          'person-6',
          'person-5',
          'person-4',
          'person-3',
          'person-2',
          'person-1',
          'person-0',
        ]);

        // Slide back partway toward the head -- far enough that the tail page confirming the end
        // gets trimmed away, but not all the way to skip 0 (which would fully reset the window
        // regardless of this bug).
        const middle = yield* Feed.query(
          feed,
          Query.select(Filter.type(TestSchema.Person)).orderBy(Order.natural('desc')).skip(50).limit(20),
        ).run;
        expect(middle.map((person) => person.name)).toEqual([
          'person-69',
          'person-68',
          'person-67',
          'person-66',
          'person-65',
          'person-64',
          'person-63',
          'person-62',
          'person-61',
          'person-60',
          'person-59',
          'person-58',
          'person-57',
          'person-56',
          'person-55',
          'person-54',
          'person-53',
          'person-52',
          'person-51',
          'person-50',
        ]);

        // Scroll toward older items again, past what's already buffered -- must fetch further,
        // not silently undershoot to whatever happens to already be in memory.
        const down = yield* Feed.query(
          feed,
          Query.select(Filter.type(TestSchema.Person)).orderBy(Order.natural('desc')).skip(90).limit(20),
        ).run;
        expect(down.map((person) => person.name)).toEqual([
          'person-29',
          'person-28',
          'person-27',
          'person-26',
          'person-25',
          'person-24',
          'person-23',
          'person-22',
          'person-21',
          'person-20',
          'person-19',
          'person-18',
          'person-17',
          'person-16',
          'person-15',
          'person-14',
          'person-13',
          'person-12',
          'person-11',
          'person-10',
        ]);
      }).pipe(Effect.provide(testLayer), EffectEx.runAndForwardErrors);
    });

    test('a plain (non-windowed) query on the same feed is unaffected by the window', async ({ expect }) => {
      await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
      const db = await peer.createDatabase();
      const testLayer = Database.layer(db);

      await Effect.gen(function* () {
        const feed = yield* Database.add(Feed.make({ name: 'windowed-and-plain' }));
        yield* appendPeople(feed, 5);

        const windowed = yield* Feed.query(
          feed,
          Query.select(Filter.type(TestSchema.Person)).orderBy(Order.natural('desc')).limit(2),
        ).run;
        expect(windowed.map((person) => person.name)).toEqual(['person-4', 'person-3']);

        const all = yield* Feed.query(feed, Filter.type(TestSchema.Person)).run;
        expect(all).toHaveLength(5);
      }).pipe(Effect.provide(testLayer), EffectEx.runAndForwardErrors);
    });
  });

  describe('partial loading (windowed queries never load the whole feed)', () => {
    test('windowed reads issue only bounded, cursor-limited queue requests', async ({ expect }) => {
      await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
      const db = await peer.createDatabase();
      const testLayer = Database.layer(db);

      const FEED_SIZE = 200;
      const PAGE_SIZE = 10;

      let feed!: Feed.Feed;
      await Effect.gen(function* () {
        feed = yield* Database.add(Feed.make({ name: 'large' }));
        for (let i = 0; i < FEED_SIZE; i++) {
          yield* Feed.append(feed, [Obj.make(TestSchema.Person, { name: `person-${i}` })]);
        }
      }).pipe(Effect.provide(testLayer), EffectEx.runAndForwardErrors);

      // `queryQueue` is async -- `spy.mock.results[i].value` on a plain `vi.spyOn` would be the
      // (unresolved) Promise, not the awaited payload, so capture resolved responses explicitly.
      const original = peer.host.queuesService.queryQueue.bind(peer.host.queuesService);
      const resolvedResponses: FeedProtocol.QueryResult[] = [];
      const spy = vi.spyOn(peer.host.queuesService, 'queryQueue').mockImplementation(async (request) => {
        const response = await original(request);
        resolvedResponses.push(response);
        return response;
      });

      const query = Query.select(Filter.type(TestSchema.Person))
        .from(feed)
        .orderBy(Order.natural('desc'))
        .limit(PAGE_SIZE);
      const queryResult = db.query(query);

      const called = new Event();
      const settled = called.waitForCount(2); // synchronous fire:true (empty) + async load.
      const unsubscribe = queryResult.subscribe(() => called.emit(), { fire: true });
      await settled;

      expect(queryResult.results).toHaveLength(PAGE_SIZE);

      // Every request the window issued must be cursor-bounded -- never an unbounded full-feed
      // fetch (which would have no `limit` at all).
      for (const call of spy.mock.calls) {
        const requestedLimit = call[0].query?.limit;
        expect(requestedLimit).toBeDefined();
        expect(requestedLimit!).toBeLessThanOrEqual(50);
      }

      // Total objects returned across all requests stays proportional to the loaded window, not
      // the feed size -- the whole point of lazy loading.
      const totalObjectsReturned = resolvedResponses.reduce(
        (sum, response) => sum + (response.objects?.length ?? 0),
        0,
      );
      expect(totalObjectsReturned).toBeGreaterThan(0);
      expect(totalObjectsReturned).toBeLessThan(FEED_SIZE / 2);

      unsubscribe();
      spy.mockRestore();
    });

    test('a plain (non-windowed) query on the same feed is the documented escape hatch that loads everything', async ({
      expect,
    }) => {
      await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
      const db = await peer.createDatabase();
      const testLayer = Database.layer(db);

      const FEED_SIZE = 30;
      let feed!: Feed.Feed;
      await Effect.gen(function* () {
        feed = yield* Database.add(Feed.make({ name: 'small' }));
        for (let i = 0; i < FEED_SIZE; i++) {
          yield* Feed.append(feed, [Obj.make(TestSchema.Person, { name: `person-${i}` })]);
        }
      }).pipe(Effect.provide(testLayer), EffectEx.runAndForwardErrors);

      const spy = vi.spyOn(peer.host.queuesService, 'queryQueue');

      // No orderBy/limit -- this is the legacy full-feed path, kept intentionally distinct from
      // the windowed path above so its (documented) unbounded-load behavior doesn't regress
      // silently into the windowed path or vice versa.
      const all = await db.query(Query.select(Filter.type(TestSchema.Person)).from(feed)).run();
      expect(all).toHaveLength(FEED_SIZE);
      expect(spy.mock.calls.some((call) => call[0].query?.limit === undefined)).toBe(true);

      spy.mockRestore();
    });
  });

  describe('feed namespaces', () => {
    test('Feed.append assigns data and trace namespaces in feed store', async ({ expect }) => {
      await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
      const db = await peer.createDatabase();
      const testLayer = Database.layer(db);

      let dataFeed!: Feed.Feed;
      let traceFeed!: Feed.Feed;
      await Effect.gen(function* () {
        dataFeed = yield* Database.add(Feed.make({ name: 'data-feed' }));
        traceFeed = yield* Database.add(Feed.make({ name: 'trace-feed', namespace: 'trace' }));

        yield* Feed.append(dataFeed, [Obj.make(TestSchema.Person, { name: 'data-item' })]);
        yield* Feed.append(traceFeed, [Obj.make(TestSchema.Person, { name: 'trace-item' })]);
      }).pipe(Effect.provide(testLayer), EffectEx.runAndForwardErrors);

      const feeds = await peer.host.getAllFeedsForSpace(db.spaceId);

      expect(
        feeds.find(
          (feed) => feed.feedId === dataFeed.id && feed.feedNamespace === FeedProtocol.WellKnownNamespaces.data,
        )?.blocks.length ?? 0,
      ).toBe(1);
      expect(
        feeds.find(
          (feed) => feed.feedId === traceFeed.id && feed.feedNamespace === FeedProtocol.WellKnownNamespaces.trace,
        )?.blocks.length ?? 0,
      ).toBe(1);
      expect(
        feeds.find(
          (feed) => feed.feedId === traceFeed.id && feed.feedNamespace === FeedProtocol.WellKnownNamespaces.data,
        )?.blocks.length ?? 0,
      ).toBe(0);
    });

    test('Feed.query reads trace feed items from trace namespace', async ({ expect }) => {
      await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
      const db = await peer.createDatabase();
      const testLayer = Database.layer(db);

      let traceFeed!: Feed.Feed;
      await Effect.gen(function* () {
        traceFeed = yield* Database.add(Feed.make({ name: 'trace-feed', namespace: 'trace' }));
        yield* Feed.append(traceFeed, [Obj.make(TestSchema.Person, { name: 'trace-item' })]);
        const results = yield* Feed.query(traceFeed, Filter.type(TestSchema.Person)).run;
        expect(results).toHaveLength(1);
        expect((results[0] as TestSchema.Person).name).toBe('trace-item');
      }).pipe(Effect.provide(testLayer), EffectEx.runAndForwardErrors);

      const feeds = await peer.host.getAllFeedsForSpace(db.spaceId);
      expect(
        feeds.find(
          (feed) => feed.feedId === traceFeed.id && feed.feedNamespace === FeedProtocol.WellKnownNamespaces.trace,
        )?.blocks.length ?? 0,
      ).toBe(1);
      expect(
        feeds.find(
          (feed) => feed.feedId === traceFeed.id && feed.feedNamespace === FeedProtocol.WellKnownNamespaces.data,
        )?.blocks.length ?? 0,
      ).toBe(0);
    });

    test('queue service reads trace feed items from trace namespace', async ({ expect }) => {
      await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
      const db = await peer.createDatabase();
      const testLayer = Database.layer(db);

      let traceFeed!: Feed.Feed;
      await Effect.gen(function* () {
        traceFeed = yield* Database.add(Feed.make({ name: 'trace-feed', namespace: 'trace' }));
        yield* Feed.append(traceFeed, [Obj.make(TestSchema.Person, { name: 'trace-item' })]);
      }).pipe(Effect.provide(testLayer), EffectEx.runAndForwardErrors);

      const traceResult = await peer.host.queuesService.queryQueue({
        query: {
          spaceId: db.spaceId,
          queueIds: [traceFeed.id],
          queuesNamespace: FeedProtocol.WellKnownNamespaces.trace,
        },
      });
      expect(traceResult.objects?.length).toBe(1);

      const dataResult = await peer.host.queuesService.queryQueue({
        query: {
          spaceId: db.spaceId,
          queueIds: [traceFeed.id],
          queuesNamespace: FeedProtocol.WellKnownNamespaces.data,
        },
      });
      expect(dataResult.objects?.length).toBe(0);
    });
  });
});
