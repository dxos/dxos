//
// Copyright 2025 DXOS.org
//

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Event } from '@dxos/async';
import { Entity, Feed, Filter, Obj, Order, Query, Ref, Relation, Scope } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { EID } from '@dxos/keys';
import { FeedProtocol } from '@dxos/protocols';

import { type EchoDatabase } from '../proxy-db';
import { EchoTestBuilder } from './echo-test-builder';

describe('feeds', () => {
  let builder: EchoTestBuilder;
  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });
  afterEach(async () => {
    await builder.close();
  });

  test('resolve reference to a feed', async () => {
    await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
    const db = await peer.createDatabase();
    const feed = db.add(Feed.make({ name: 'queue' }));
    const obj = db.add(
      Obj.make(TestSchema.Expando, {
        queue: Ref.make(feed),
      }),
    );

    expect(obj.queue.target).toBeDefined();
    expect(await obj.queue.load()).toBeDefined();
  });

  test('Entity.getURI on feed items returns absolute dxn', async () => {
    await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
    const db = await peer.createDatabase();
    const feed = db.add(Feed.make({ name: 'people' }));

    const john = Obj.make(TestSchema.Person, { name: 'john' });
    await db.appendToFeed(feed, [john]);
    const [obj] = await queryFeed(db, feed, Filter.everything()).run();
    // Feed items now receive an ECHO-kind DXN (echo://spaceId/itemId), not a queue DXN.
    expect(Entity.getURI(obj)).toEqual(EID.make({ spaceId: db.spaceId, entityId: obj.id }));
  });

  test('create and resolve an object from a feed', async () => {
    await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
    const db = await peer.createDatabase();
    const feed = db.add(Feed.make({ name: 'people' }));

    const obj = Obj.make(TestSchema.Person, { name: 'john' });
    await db.appendToFeed(feed, [obj]);

    {
      // Resolve feed item using feed context. Since feed items have ECHO-kind DXNs
      // (echo://spaceId/itemId) without feed routing info, a local object DXN + feed
      // context is the correct way to resolve them.
      const resolved = await peer.client.graph
        .createRefResolver({ context: { space: db.spaceId, feed: Feed.getFeedUri(feed)! } })
        .resolve(EID.make({ entityId: obj.id }), { source: 'network' })
        .wait();
      expect(resolved?.id).toEqual(obj.id);
      expect(resolved?.name).toEqual('john');
      expect(Obj.getType(resolved as Obj.Unknown)).toEqual(TestSchema.Person);
    }
  });

  test('objects in feeds have positions', async () => {
    await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person], assignQueuePositions: true });
    const db = await peer.createDatabase();
    const feed = db.add(Feed.make({ name: 'people' }));

    await db.appendToFeed(feed, [
      // prettier-ignore
      Obj.make(TestSchema.Person, { name: 'john' }),
      Obj.make(TestSchema.Person, { name: 'jane' }),
    ]);

    const objects = await queryFeed(db, feed, Filter.everything()).run();
    expect(objects).toHaveLength(2);
    expect(Entity.getKeys(objects[0], FeedProtocol.KEY_QUEUE_POSITION).at(0)?.id).toEqual('0');
    expect(Entity.getKeys(objects[1], FeedProtocol.KEY_QUEUE_POSITION).at(0)?.id).toEqual('1');
  });

  test('relations in feeds', async () => {
    await using peer = await builder.createPeer({
      types: [Feed.Feed, TestSchema.Person, TestSchema.Organization, TestSchema.EmployedBy],
    });
    const db = await peer.createDatabase();
    const feed = db.add(Feed.make({ name: 'relations' }));

    {
      const obj1 = Obj.make(TestSchema.Person, { name: 'john' });
      const obj2 = Obj.make(TestSchema.Organization, { name: 'DXOS' });
      const relation = Relation.make(TestSchema.EmployedBy, {
        [Relation.Source]: obj1,
        [Relation.Target]: obj2,
        role: 'CIO',
      });

      await db.appendToFeed(feed, [obj1, obj2, relation]);
    }

    {
      const [obj1, obj2, relation] = await queryFeed(db, feed, Filter.everything()).run();
      expect((obj1 as TestSchema.Person).name).toEqual('john');
      expect((obj2 as TestSchema.Organization).name).toEqual('DXOS');
      expect(Relation.getSource(relation as TestSchema.EmployedBy).name).toEqual('john');
      expect(Relation.getTarget(relation as TestSchema.EmployedBy).name).toEqual('DXOS');
    }
  });

  // Expected to fail: a relation in a feed whose source lives in the automerge database hangs
  // during query because the strong-dep resolver cannot yet bridge feed→database direction.
  // Unskip once feed→db strong-dep resolution is implemented.
  test.fails('relation between feed object and a database object', async () => {
    await using peer = await builder.createPeer({
      types: [Feed.Feed, TestSchema.Person, TestSchema.Organization, TestSchema.EmployedBy],
    });
    const db = await peer.createDatabase();
    const feed = db.add(Feed.make({ name: 'relations' }));

    {
      const contact = db.add(Obj.make(TestSchema.Person, { name: 'alice' }));
      const org = Obj.make(TestSchema.Organization, { name: 'DXOS' });
      const relation = Relation.make(TestSchema.EmployedBy, {
        [Relation.Source]: contact,
        [Relation.Target]: org,
        role: 'CTO',
      });

      await db.appendToFeed(feed, [org, relation]);
    }

    {
      const [org, relation] = await queryFeed(db, feed, Filter.everything()).run();
      expect((org as TestSchema.Organization).name).toEqual('DXOS');
      expect(Relation.getSource(relation as TestSchema.EmployedBy).name).toEqual('alice');
      expect(Relation.getTarget(relation as TestSchema.EmployedBy).name).toEqual('DXOS');
    }
  });

  describe('Query', () => {
    test('one shot query everything', async ({ expect }) => {
      await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
      const db = await peer.createDatabase();
      const feed = db.add(Feed.make({ name: 'people' }));

      await db.appendToFeed(feed, [
        Obj.make(TestSchema.Person, { name: 'john' }),
        Obj.make(TestSchema.Person, { name: 'jane' }),
        Obj.make(TestSchema.Person, { name: 'alice' }),
      ]);

      const result = await queryFeed(db, feed, Filter.everything()).run();
      expect(result).toHaveLength(3);
      expect(result.map((obj) => (obj as TestSchema.Person).name).sort()).toEqual(['alice', 'jane', 'john']);
    });

    test('one shot query contacts', async ({ expect }) => {
      await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person, TestSchema.Task] });
      const db = await peer.createDatabase();
      const feed = db.add(Feed.make({ name: 'mixed' }));

      await db.appendToFeed(feed, [
        Obj.make(TestSchema.Person, { name: 'john' }),
        Obj.make(TestSchema.Task, { title: 'Write tests' }),
        Obj.make(TestSchema.Person, { name: 'jane' }),
      ]);

      const result = await queryFeed(db, feed, Filter.type(TestSchema.Person)).run();
      expect(result).toHaveLength(2);
      expect(result.map((o) => (o as TestSchema.Person).name).sort()).toEqual(['jane', 'john']);
    });

    test('queries local feed with TestSchema.Person schema', async ({ expect }) => {
      await using peer = await builder.createPeer({ types: [Feed.Feed] });
      const db = await peer.createDatabase();
      const feed = db.add(Feed.make({ name: 'people' }));

      const localObject = Obj.make(TestSchema.Person, { name: 'local-only' });
      await db.appendToFeed(feed, [localObject]);

      const localFeedObjects = await queryFeed(db, feed, Filter.type(TestSchema.Person, { name: 'local-only' })).run();

      expect(localFeedObjects).toHaveLength(1);
      expect(localFeedObjects[0].id).toEqual(localObject.id);
      expect(localFeedObjects[0].name).toEqual('local-only');
    });

    test('queries local feed with TestSchema.Expando schema', async ({ expect }) => {
      await using peer = await builder.createPeer({ types: [Feed.Feed] });
      const db = await peer.createDatabase();
      const feed = db.add(Feed.make({ name: 'expandos' }));

      const localObject = Obj.make(TestSchema.Expando, { message: 'local-only' });
      await db.appendToFeed(feed, [localObject]);

      const localFeedObjects = await queryFeed(
        db,
        feed,
        Filter.type(TestSchema.Expando, { message: 'local-only' }),
      ).run();

      expect(localFeedObjects).toHaveLength(1);
      expect(localFeedObjects[0].id).toEqual(localObject.id);
      expect(localFeedObjects[0].message).toEqual('local-only');
    });

    test('one shot query with name predicate', async ({ expect }) => {
      await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
      const db = await peer.createDatabase();
      const feed = db.add(Feed.make({ name: 'people' }));

      await db.appendToFeed(feed, [
        Obj.make(TestSchema.Person, { name: 'john' }),
        Obj.make(TestSchema.Person, { name: 'jane' }),
        Obj.make(TestSchema.Person, { name: 'alice' }),
      ]);

      const result = await queryFeed(db, feed, Filter.type(TestSchema.Person, { name: 'jane' })).run();
      expect(result).toHaveLength(1);
      expect(result[0].name).toEqual('jane');
    });

    test('one shot query by id', async ({ expect }) => {
      await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
      const db = await peer.createDatabase();
      const feed = db.add(Feed.make({ name: 'people' }));

      const john = Obj.make(TestSchema.Person, { name: 'john' });
      const jane = Obj.make(TestSchema.Person, { name: 'jane' });
      const alice = Obj.make(TestSchema.Person, { name: 'alice' });

      await db.appendToFeed(feed, [john, jane, alice]);

      // Query by specific ID.
      const result = await queryFeed(db, feed, Filter.id(jane.id)).run();
      expect(result).toHaveLength(1);
      expect(result[0].id).toEqual(jane.id);
      expect((result[0] as TestSchema.Person).name).toEqual('jane');
    });

    test('subscription query gets initial result', async ({ expect }) => {
      await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
      const db = await peer.createDatabase();
      const feed = db.add(Feed.make({ name: 'people' }));

      await db.appendToFeed(feed, [
        Obj.make(TestSchema.Person, { name: 'john' }),
        Obj.make(TestSchema.Person, { name: 'jane' }),
      ]);

      const called = new Event();
      const query = queryFeed(db, feed, Filter.type(TestSchema.Person));
      const calledOnce = called.waitForCount(1);
      const sub = query.subscribe(() => called.emit(), { fire: true });

      // Wait a bit to ensure subscription is processed.
      await calledOnce;
      expect(query.results).toHaveLength(2);
      expect(query.results.map((o) => o.name).sort()).toEqual(['jane', 'john']);
      sub();
    });

    test('subscription query updates on append', async ({ expect }) => {
      await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
      const db = await peer.createDatabase();
      const feed = db.add(Feed.make({ name: 'people' }));

      await db.appendToFeed(feed, [Obj.make(TestSchema.Person, { name: 'john' })]);

      const query = queryFeed(db, feed, Filter.type(TestSchema.Person));
      const called = new Event();
      const calledOnce = called.waitForCount(1);
      const sub = query.subscribe(() => called.emit());

      // Append new contact.
      await db.appendToFeed(feed, [Obj.make(TestSchema.Person, { name: 'jane' })]);

      // Wait for update.
      await calledOnce;
      expect(query.results).toHaveLength(2);
      expect(query.results.map((obj) => obj.name).sort()).toEqual(['jane', 'john']);
      sub();
    });
  });

  describe('Windowed query', () => {
    test('one-shot `Order.natural(desc).limit(n)` returns the newest N (tail window), newest-first', async ({
      expect,
    }) => {
      await using peer = await builder.createPeer({
        types: [Feed.Feed, TestSchema.Person],
        assignQueuePositions: true,
      });
      const db = await peer.createDatabase();
      const feed = db.add(Feed.make({ name: 'people' }));

      await db.appendToFeed(feed, [
        Obj.make(TestSchema.Person, { name: 'a' }),
        Obj.make(TestSchema.Person, { name: 'b' }),
        Obj.make(TestSchema.Person, { name: 'c' }),
        Obj.make(TestSchema.Person, { name: 'd' }),
      ]);

      const scope = Scope.feed(Feed.getFeedUri(feed)!);
      const window = await db
        .query(Query.select(Filter.type(TestSchema.Person)).from(scope).orderBy(Order.natural('desc')).limit(2))
        .run();
      // Newest two (appended last), returned newest-first (natural desc).
      expect(window.map((obj) => (obj as TestSchema.Person).name)).toEqual(['d', 'c']);

      // No limit ⇒ the whole feed (unchanged behavior).
      const all = await db.query(Query.select(Filter.type(TestSchema.Person)).from(scope)).run();
      expect(all).toHaveLength(4);
    });

    test('reactive `.limit(n)` windows the newest N and extends when the limit grows', async ({ expect }) => {
      await using peer = await builder.createPeer({
        types: [Feed.Feed, TestSchema.Person],
        assignQueuePositions: true,
      });
      const db = await peer.createDatabase();
      const feed = db.add(Feed.make({ name: 'people' }));

      await db.appendToFeed(feed, [
        Obj.make(TestSchema.Person, { name: 'a' }),
        Obj.make(TestSchema.Person, { name: 'b' }),
        Obj.make(TestSchema.Person, { name: 'c' }),
      ]);

      const scope = Scope.feed(Feed.getFeedUri(feed)!);

      const narrow = db.query(Query.select(Filter.type(TestSchema.Person)).from(scope).orderBy(Order.natural('desc')).limit(2));
      const narrowCalled = new Event();
      const narrowOnce = narrowCalled.waitForCount(1);
      const narrowSub = narrow.subscribe(() => narrowCalled.emit(), { fire: true });
      await narrowOnce;
      expect(narrow.results.map((obj) => obj.name).sort()).toEqual(['b', 'c']);
      narrowSub();

      // A wider window (the "load older" case) surfaces the older items too.
      const wide = db.query(Query.select(Filter.type(TestSchema.Person)).from(scope).orderBy(Order.natural('desc')).limit(10));
      const wideCalled = new Event();
      const wideOnce = wideCalled.waitForCount(1);
      const wideSub = wide.subscribe(() => wideCalled.emit(), { fire: true });
      await wideOnce;
      expect(wide.results.map((obj) => obj.name).sort()).toEqual(['a', 'b', 'c']);
      wideSub();
    });

    test('windowed query returns the newest N in order at scale', async ({ expect }) => {
      await using peer = await builder.createPeer({
        types: [Feed.Feed, TestSchema.Person],
        assignQueuePositions: true,
      });
      const db = await peer.createDatabase();
      const feed = db.add(Feed.make({ name: 'people' }));

      const total = 60;
      await db.appendToFeed(
        feed,
        Array.from({ length: total }, (_, index) => Obj.make(TestSchema.Person, { name: `p${index}` })),
      );

      const window = await db
        .query(
          Query.select(Filter.type(TestSchema.Person))
            .from(Scope.feed(Feed.getFeedUri(feed)!))
            .orderBy(Order.natural('desc'))
            .limit(25),
        )
        .run();
      // Newest 25 (p59..p35), newest-first (natural desc).
      expect(window.map((obj) => (obj as TestSchema.Person).name)).toEqual(
        Array.from({ length: 25 }, (_, index) => `p${total - 1 - index}`),
      );
    });

    // Content-ordered (non-`natural`) feed paging — the mailbox's path (order by a message field, not
    // insertion order). A content order routes to the host indexer, which sorts + slices the indexed
    // feed and returns only the requested window (the client never decodes the whole feed). The
    // indexer resolves after indexing, so this waits for `updateIndexes()`; `usePagination` handles
    // that latency in-app. Guards the skip+limit propagation fix — a slid window (`skip > 0`) must
    // return the full page, not `limit - skip`. `total` stays within one indexing pass.
    test('content-ordered `.orderBy(property).skip().limit()` windows via the indexer', async ({ expect }) => {
      await using peer = await builder.createPeer({
        types: [Feed.Feed, TestSchema.Person],
        assignQueuePositions: true,
      });
      const db = await peer.createDatabase();
      const feed = db.add(Feed.make({ name: 'people' }));

      const total = 40;
      const names = Array.from({ length: total }, (_, index) => `p${String(index).padStart(2, '0')}`);
      // Append in an order distinct from name order (odds then evens) so a correct result must sort by
      // the `name` property, not rely on insertion order — mimics an out-of-order/backfill sync.
      const shuffled = [...names.filter((_, index) => index % 2 === 1), ...names.filter((_, index) => index % 2 === 0)];
      await db.appendToFeed(
        feed,
        shuffled.map((name) => Obj.make(TestSchema.Person, { name })),
      );
      await db.updateIndexes();

      const scope = Scope.feed(Feed.getFeedUri(feed)!);
      const page = (skip: number, limit: number) =>
        db
          .query(
            Query.select(Filter.type(TestSchema.Person))
              .from(scope)
              .orderBy(Order.property('name', 'desc'))
              .skip(skip)
              .limit(limit),
          )
          .run()
          .then((rows) => rows.map((obj) => (obj as TestSchema.Person).name));

      const expectedDesc = [...names].reverse(); // p39..p00 by name desc.
      // Grow-limit paging (what usePagination does before it slides): each window is the newest-by-name prefix.
      for (const limit of [10, 20, 30, 40]) {
        expect(await page(0, limit)).toEqual(expectedDesc.slice(0, limit));
      }
      // Slide window (skip advances once usePagination hits maxWindowSize): the next content-ordered slice.
      expect(await page(10, 30)).toEqual(expectedDesc.slice(10, 40));
    });
  });

  describe('Durability', () => {
    test('feed objects survive reload', async ({ expect }) => {
      await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
      const db = await peer.createDatabase();
      const feed = db.add(Feed.make({ name: 'people' }));
      await db.flush();

      await db.appendToFeed(feed, [Obj.make(TestSchema.Person, { name: 'john' })]);

      await peer.reload();

      const db2 = await peer.openLastDatabase();
      const [feed2] = await db2.query(Filter.type(Feed.Feed)).run();
      const objects2 = await queryFeed(db2, feed2, Filter.everything()).run();

      expect(objects2).toHaveLength(1);
      expect(objects2[0].name).toEqual('john');

      await peer.close();
    });
  });
});

/**
 * Queries a feed through the database with a feed scope — the canonical non-Effect feed query.
 */
const queryFeed = (db: EchoDatabase, feed: Feed.Feed, filter: Filter.Any) =>
  db.query(Query.select(filter).from(Scope.feed(Feed.getFeedUri(feed)!)));
