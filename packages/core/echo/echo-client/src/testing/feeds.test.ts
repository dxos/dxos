//
// Copyright 2025 DXOS.org
//

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Event } from '@dxos/async';
import { Entity, Feed, Filter, Obj, Query, Ref, Relation, Scope } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { EID } from '@dxos/keys';
import { FeedProtocol } from '@dxos/protocols';

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
    const [obj] = await db.query(Query.select(Filter.everything()).from(Scope.feed(Feed.getFeedUri(feed)!))).run();
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

    const objects = await db.query(Query.select(Filter.everything()).from(Scope.feed(Feed.getFeedUri(feed)!))).run();
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
      const [obj1, obj2, relation] = await db.query(Query.select(Filter.everything()).from(Scope.feed(Feed.getFeedUri(feed)!))).run();
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
      const [org, relation] = await db.query(Query.select(Filter.everything()).from(Scope.feed(Feed.getFeedUri(feed)!))).run();
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

      const result = await db.query(Query.select(Filter.everything()).from(Scope.feed(Feed.getFeedUri(feed)!))).run();
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

      const result = await db.query(Query.select(Filter.type(TestSchema.Person)).from(Scope.feed(Feed.getFeedUri(feed)!))).run();
      expect(result).toHaveLength(2);
      expect(result.map((o) => (o as TestSchema.Person).name).sort()).toEqual(['jane', 'john']);
    });

    test('queries local feed with TestSchema.Person schema', async ({ expect }) => {
      await using peer = await builder.createPeer({ types: [Feed.Feed] });
      const db = await peer.createDatabase();
      const feed = db.add(Feed.make({ name: 'people' }));

      const localObject = Obj.make(TestSchema.Person, { name: 'local-only' });
      await db.appendToFeed(feed, [localObject]);

      const localFeedObjects = await db
        .query(
          Query.select(Filter.type(TestSchema.Person, { name: 'local-only' })).from(
            Scope.feed(Feed.getFeedUri(feed)!),
          ),
        )
        .run();

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

      const localFeedObjects = await db
        .query(
          Query.select(Filter.type(TestSchema.Expando, { message: 'local-only' })).from(
            Scope.feed(Feed.getFeedUri(feed)!),
          ),
        )
        .run();

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

      const result = await db
        .query(Query.select(Filter.type(TestSchema.Person, { name: 'jane' })).from(Scope.feed(Feed.getFeedUri(feed)!)))
        .run();
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
      const result = await db.query(Query.select(Filter.id(jane.id)).from(Scope.feed(Feed.getFeedUri(feed)!))).run();
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
      const query = db.query(Query.select(Filter.type(TestSchema.Person)).from(Scope.feed(Feed.getFeedUri(feed)!)));
      const calledOnce = called.waitForCount(1);
      const sub = query.subscribe(() => called.emit(), { fire: true });

      // The initial event is deferred until the async index results arrive (no empty snapshot).
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

      const query = db.query(Query.select(Filter.type(TestSchema.Person)).from(Scope.feed(Feed.getFeedUri(feed)!)));
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

  describe('initial subscription event', () => {
    test('async feed query defers the initial event until results arrive', async ({ expect }) => {
      await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
      const db = await peer.createDatabase();
      const feed = db.add(Feed.make({ name: 'people' }));

      await db.appendToFeed(feed, [Obj.make(TestSchema.Person, { name: 'john' })]);

      const query = db.query(Query.select(Filter.type(TestSchema.Person)).from(Scope.feed(Feed.getFeedUri(feed)!)));
      const observed: number[] = [];
      const called = new Event();
      const calledOnce = called.waitForCount(1);
      const sub = query.subscribe(
        () => {
          observed.push(query.results.length);
          if (query.results.length === 1) {
            called.emit();
          }
        },
        { fire: true },
      );

      // A feed query has no synchronous source, so `fire: true` must NOT emit an empty snapshot.
      expect(observed).toEqual([]);

      await calledOnce;
      expect(query.results).toHaveLength(1);
      // The deferred event carried real results — an empty snapshot was never observed.
      expect(observed).not.toContain(0);
      sub();
    });

    test('synchronous space query still fires an empty initial event immediately', async ({ expect }) => {
      await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
      const db = await peer.createDatabase();

      const query = db.query(Filter.type(TestSchema.Person));
      const observed: number[] = [];
      const sub = query.subscribe(() => observed.push(query.results.length), { fire: true });

      // The working set serves space queries synchronously, so the initial event fires immediately
      // even when there are no results.
      expect(observed).toEqual([0]);
      sub();
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
      const objects2 = await db2
        .query(Query.select(Filter.everything()).from(Scope.feed(Feed.getFeedUri(feed2)!)))
        .run();

      expect(objects2).toHaveLength(1);
      expect(objects2[0].name).toEqual('john');

      await peer.close();
    });
  });
});
