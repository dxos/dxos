//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Event } from '@dxos/async';
import { Database, Feed, Filter, Obj, Query, Ref } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { runAndForwardErrors } from '@dxos/effect';
import { EID, PublicKey } from '@dxos/keys';
import { FeedProtocol } from '@dxos/protocols';

import { EchoTestBuilder } from '../testing';
import { createFeedServiceLayer } from './feed-service';

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
    const queues = peer.client.constructQueueFactory(db.spaceId);
    const testLayer = Layer.merge(Database.layer(db), createFeedServiceLayer(queues));

    await Effect.gen(function* () {
      const feed = yield* Database.add(Feed.make({ name: 'removable' }));

      const alice = Obj.make(TestSchema.Person, { name: 'alice' });
      const bob = Obj.make(TestSchema.Person, { name: 'bob' });
      yield* Feed.append(feed, [alice, bob]);

      yield* Feed.remove(feed, [alice]);
    }).pipe(Effect.provide(testLayer), runAndForwardErrors);
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

      const notificationFeeds = yield* Database.runQuery(
        Filter.type(Feed.Feed, { kind: 'org.dxos.plugin.notifications.v1' }),
      );
      expect(notificationFeeds).toHaveLength(2);
      expect(notificationFeeds.map((feed) => feed.name).sort()).toEqual(['notifications', 'other-notifications']);
    }).pipe(Effect.provide(testLayer), runAndForwardErrors);
  });

  test('query items in a feed', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
    const db = await peer.createDatabase();
    const queues = peer.client.constructQueueFactory(db.spaceId);
    const testLayer = Layer.merge(Database.layer(db), createFeedServiceLayer(queues));

    await Effect.gen(function* () {
      const feed = yield* Database.add(Feed.make({ name: 'queryable' }));

      const alice = Obj.make(TestSchema.Person, { name: 'alice' });
      const bob = Obj.make(TestSchema.Person, { name: 'bob' });
      yield* Feed.append(feed, [alice, bob]);

      const results = yield* Feed.runQuery(feed, Filter.type(TestSchema.Person));
      expect(results).toHaveLength(2);
      expect(results.map((item: any) => item.name).sort()).toEqual(['alice', 'bob']);
    }).pipe(Effect.provide(testLayer), runAndForwardErrors);
  });

  test('feed objects have database returned with Obj.getDatabase', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
    const db = await peer.createDatabase();
    const queues = peer.client.constructQueueFactory(db.spaceId);
    const testLayer = Layer.merge(Database.layer(db), createFeedServiceLayer(queues));

    await Effect.gen(function* () {
      const feed = yield* Database.add(Feed.make({ name: 'database-test' }));

      const alice = Obj.make(TestSchema.Person, { name: 'alice' });
      yield* Feed.append(feed, [alice]);

      const results = yield* Feed.runQuery(feed, Filter.type(TestSchema.Person));
      expect(results).toHaveLength(1);

      const feedObject = results[0];
      const objDb = Obj.getDatabase(feedObject);
      expect(objDb).toBeDefined();
      expect(objDb?.spaceId).toEqual(db.spaceId);
    }).pipe(Effect.provide(testLayer), runAndForwardErrors);
  });

  test('getParent returns Feed object for appended items', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
    const db = await peer.createDatabase();
    const queues = peer.client.constructQueueFactory(db.spaceId);
    const testLayer = Layer.merge(Database.layer(db), createFeedServiceLayer(queues));

    await Effect.gen(function* () {
      const feed = yield* Database.add(Feed.make({ name: 'parent-test' }));

      const alice = Obj.make(TestSchema.Person, { name: 'alice' });
      yield* Feed.append(feed, [alice]);

      const parent = Obj.getParent(alice);
      expect(parent).toBeDefined();
      expect(parent).toBe(feed);
    }).pipe(Effect.provide(testLayer), runAndForwardErrors);
  });

  test('getParent returns Feed object for queried items', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
    const db = await peer.createDatabase();
    const queues = peer.client.constructQueueFactory(db.spaceId);
    const testLayer = Layer.merge(Database.layer(db), createFeedServiceLayer(queues));

    await Effect.gen(function* () {
      const feed = yield* Database.add(Feed.make({ name: 'parent-query-test' }));

      const alice = Obj.make(TestSchema.Person, { name: 'alice' });
      const bob = Obj.make(TestSchema.Person, { name: 'bob' });
      yield* Feed.append(feed, [alice, bob]);

      const results = yield* Feed.runQuery(feed, Filter.type(TestSchema.Person));
      expect(results).toHaveLength(2);
      for (const item of results) {
        const parent = Obj.getParent(item);
        expect(parent).toBeDefined();
        expect(parent).toBe(feed);
      }
    }).pipe(Effect.provide(testLayer), runAndForwardErrors);
  });

  test('query.subscribe fires with current results when fire: true', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
    const db = await peer.createDatabase();
    const queues = peer.client.constructQueueFactory(db.spaceId);
    const testLayer = Layer.merge(Database.layer(db), createFeedServiceLayer(queues));

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
    }).pipe(Effect.provide(testLayer), runAndForwardErrors);
  });

  test('query.subscribe fires when items are appended', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
    const db = await peer.createDatabase();
    const queues = peer.client.constructQueueFactory(db.spaceId);
    const testLayer = Layer.merge(Database.layer(db), createFeedServiceLayer(queues));

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
    }).pipe(Effect.provide(testLayer), runAndForwardErrors);
  });

  test('sync flushes the feed without throwing', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
    const db = await peer.createDatabase();
    const queues = peer.client.constructQueueFactory(db.spaceId);
    const testLayer = Layer.merge(Database.layer(db), createFeedServiceLayer(queues));

    await Effect.gen(function* () {
      const feed = yield* Database.add(Feed.make({ name: 'syncable' }));

      const alice = Obj.make(TestSchema.Person, { name: 'alice' });
      yield* Feed.append(feed, [alice]);
      yield* Feed.sync(feed);
      yield* Feed.sync(feed, { shouldPush: false });
      yield* Feed.sync(feed, { shouldPull: false });

      const results = yield* Feed.runQuery(feed, Filter.type(TestSchema.Person));
      expect(results).toHaveLength(1);
    }).pipe(Effect.provide(testLayer), runAndForwardErrors);
  });

  // TODO(wittjosiah): Implement when queue retention is supported.
  test.todo('setRetention configures feed retention policy');

  test('Ref.make on a feed item stores a Queue DXN and does not leak into space.db', async ({ expect }) => {
    await using peer = await builder.createPeer({
      types: [Feed.Feed, TestSchema.Person, TestSchema.Container],
    });
    const db = await peer.createDatabase();
    const queues = peer.client.constructQueueFactory(db.spaceId);
    const testLayer = Layer.merge(Database.layer(db), createFeedServiceLayer(queues));

    await Effect.gen(function* () {
      const feed = yield* Database.add(Feed.make({ name: 'posts' }));

      const post = Obj.make(TestSchema.Person, { name: 'alice' });
      yield* Feed.append(feed, [post]);

      // Re-query to obtain a queue-decoded proxy (matches the curate-magazine path).
      const items = yield* Feed.runQuery(feed, Filter.type(TestSchema.Person));
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
      const dbResults = yield* Database.runQuery(Filter.type(TestSchema.Person));
      expect(dbResults).toHaveLength(0);

      // The ref must still resolve to the queue item.
      const resolved = yield* Effect.promise(() => ref.load());
      expect((resolved as any).name).toBe('alice');
    }).pipe(Effect.provide(testLayer), runAndForwardErrors);
  });

  test('ref.load resolves queue item when feed queue is not in knownQueues', async ({ expect }) => {
    const [spaceKey] = PublicKey.randomSequence();
    await using peer = await builder.createPeer({
      types: [Feed.Feed, TestSchema.Person, TestSchema.Container],
    });
    await using db1 = await peer.createDatabase(spaceKey);
    const queues1 = peer.client.constructQueueFactory(db1.spaceId);
    const testLayer1 = Layer.merge(Database.layer(db1), createFeedServiceLayer(queues1));

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
    }).pipe(Effect.provide(testLayer1), runAndForwardErrors);

    // Fresh client: empty knownQueues cache (magazine-style ref resolution path).
    await using client2 = await peer.createClient();
    await using db2 = await peer.openDatabase(spaceKey, db1.rootUrl!, { client: client2 });
    const queues2 = client2.constructQueueFactory(db2.spaceId);
    expect([...queues2.knownQueues()]).toHaveLength(0);

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

  describe('feed namespaces', () => {
    test('Feed.append assigns data and trace namespaces in feed store', async ({ expect }) => {
      await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
      const db = await peer.createDatabase();
      const queues = peer.client.constructQueueFactory(db.spaceId);
      const testLayer = Layer.merge(Database.layer(db), createFeedServiceLayer(queues));

      let dataFeed!: Feed.Feed;
      let traceFeed!: Feed.Feed;
      await Effect.gen(function* () {
        dataFeed = yield* Database.add(Feed.make({ name: 'data-feed' }));
        traceFeed = yield* Database.add(Feed.make({ name: 'trace-feed', namespace: 'trace' }));

        yield* Feed.append(dataFeed, [Obj.make(TestSchema.Person, { name: 'data-item' })]);
        yield* Feed.append(traceFeed, [Obj.make(TestSchema.Person, { name: 'trace-item' })]);
      }).pipe(Effect.provide(testLayer), runAndForwardErrors);

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
      const queues = peer.client.constructQueueFactory(db.spaceId);
      const testLayer = Layer.merge(Database.layer(db), createFeedServiceLayer(queues));

      let traceFeed!: Feed.Feed;
      await Effect.gen(function* () {
        traceFeed = yield* Database.add(Feed.make({ name: 'trace-feed', namespace: 'trace' }));
        yield* Feed.append(traceFeed, [Obj.make(TestSchema.Person, { name: 'trace-item' })]);
        const results = yield* Feed.runQuery(traceFeed, Filter.type(TestSchema.Person));
        expect(results).toHaveLength(1);
        expect((results[0] as TestSchema.Person).name).toBe('trace-item');
      }).pipe(Effect.provide(testLayer), runAndForwardErrors);

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
      const queues = peer.client.constructQueueFactory(db.spaceId);
      const testLayer = Layer.merge(Database.layer(db), createFeedServiceLayer(queues));

      let traceFeed!: Feed.Feed;
      await Effect.gen(function* () {
        traceFeed = yield* Database.add(Feed.make({ name: 'trace-feed', namespace: 'trace' }));
        yield* Feed.append(traceFeed, [Obj.make(TestSchema.Person, { name: 'trace-item' })]);
      }).pipe(Effect.provide(testLayer), runAndForwardErrors);

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
