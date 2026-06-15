//
// Copyright 2025 DXOS.org
//

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Event } from '@dxos/async';
import { Entity, Feed, Filter, Obj, Query, Ref, Relation, Scope } from '@dxos/echo';
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
        .createRefResolver({ context: { space: db.spaceId, feed: Feed.getQueueUri(feed)! } })
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

  test('relation between feed object and a database object', async () => {
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

      const localFeedObjects = await queryFeed(
        db,
        feed,
        Filter.type(TestSchema.Person, { name: 'local-only' }),
      ).run();

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
  db.query(Query.select(filter).from(Scope.feed(Feed.getQueueUri(feed)!)));
