//
// Copyright 2025 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { Event } from '@dxos/async';
import { Entity, Feed, Filter, Obj, Query, Ref, Relation, Scope } from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-client';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { TestSchema } from '@dxos/echo/testing';
import { EID, PublicKey } from '@dxos/keys';
import { FeedProtocol } from '@dxos/protocols';

describe('feeds', () => {
  let builder: EchoTestBuilder;
  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });
  afterEach(async () => {
    await builder.close();
  });

  test('resolve reference to a feed', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
    const db = await peer.createDatabase();
    const feed = db.add(Feed.make({ name: 'queue' }));
    const obj = db.add(
      Obj.make(TestSchema.Expando, {
        queue: Ref.make(feed),
      }),
    );

    expect(obj.queue.target).toBeDefined();
    expect(typeof Entity.getURI(obj.queue.target!)).toBe('string');
    expect(await obj.queue.load()).toBeDefined();
  });

  test('Entity.getURI on feed objects returns absolute dxn', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
    const db = await peer.createDatabase();
    const feed = db.add(Feed.make({ name: 'people' }));

    await db.appendToFeed(feed, [Obj.make(TestSchema.Person, { name: 'john' })]);
    const [obj] = await queryFeed(db, feed, Filter.everything()).run();
    expect(Entity.getURI(obj)).toEqual(EID.make({ spaceId: db.spaceId, entityId: obj.id }));
  });

  test('create and resolve an object from a feed', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
    const db = await peer.createDatabase();
    const feed = db.add(Feed.make({ name: 'people' }));

    const obj = Obj.make(TestSchema.Person, { name: 'john' });
    await db.appendToFeed(feed, [obj]);

    {
      const resolved = await peer.client.graph
        .createRefResolver({ context: { space: db.spaceId, feed: Feed.getFeedUri(feed)! } })
        .resolve(EID.make({ entityId: obj.id }), { source: 'network' })
        .wait();
      expect(resolved?.id).toEqual(obj.id);
      expect(resolved?.name).toEqual('john');
      expect(Obj.getType(resolved as Obj.Unknown)).toEqual(TestSchema.Person);
    }
  });

  test('objects in feeds have positions', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person], assignQueuePositions: true });
    const db = await peer.createDatabase();
    const feed = db.add(Feed.make({ name: 'people' }));

    await db.appendToFeed(feed, [
      // prettier-ignore
      Obj.make(TestSchema.Person, { name: 'john' }),
      Obj.make(TestSchema.Person, { name: 'jane' }),
    ]);

    {
      const objects = await queryFeed(db, feed, Filter.everything()).run();
      expect(objects).toHaveLength(2);
      expect(Entity.getKeys(objects[0], FeedProtocol.KEY_QUEUE_POSITION).at(0)?.id).toEqual('0');
      expect(Entity.getKeys(objects[1], FeedProtocol.KEY_QUEUE_POSITION).at(0)?.id).toEqual('1');
    }
  });

  test('relations in feeds', async ({ expect }) => {
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
  test.fails('relation between feed object and a database object', async ({ expect }) => {
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

      await db.appendToFeed(feed, [Obj.make(TestSchema.Person, { name: 'jane' })]);

      await calledOnce;
      expect(query.results).toHaveLength(2);
      expect(query.results.map((obj) => obj.name).sort()).toEqual(['jane', 'john']);
      sub();
    });
  });

  describe('Update by id', () => {
    test('appending an item with an existing id updates it in place', async ({ expect }) => {
      await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
      const db = await peer.createDatabase();
      const feed = db.add(Feed.make({ name: 'people' }));

      // Append the original object, then append a second object reusing the same id — this is an update.
      const john = Obj.make(TestSchema.Person, { name: 'john' });
      await db.appendToFeed(feed, [john]);
      await db.appendToFeed(feed, [Obj.make(TestSchema.Person, { id: john.id, name: 'john v2' })]);

      // The query collapses entries by id and returns a single object holding the latest state.
      const result = await queryFeed(db, feed, Filter.everything()).run();
      expect(result).toHaveLength(1);
      expect(result[0].id).toEqual(john.id);
      expect((result[0] as TestSchema.Person).name).toEqual('john v2');
    });

    test('the latest state survives indexing after flush', async ({ expect }) => {
      await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
      const db = await peer.createDatabase();
      const feed = db.add(Feed.make({ name: 'people' }));

      const john = Obj.make(TestSchema.Person, { name: 'john' });
      await db.appendToFeed(feed, [john]);
      await db.appendToFeed(feed, [Obj.make(TestSchema.Person, { id: john.id, name: 'john v2' })]);

      // Flush so the query is served by the indexer rather than the in-memory feed handle.
      await db.flush();

      const result = await queryFeed(db, feed, Filter.everything()).run();
      expect(result).toHaveLength(1);
      expect(result[0].id).toEqual(john.id);
      expect((result[0] as TestSchema.Person).name).toEqual('john v2');
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
    });
  });

  describe('Live updates', () => {
    test('Obj.update mutates synchronously; direct assignment throws', async ({ expect }) => {
      await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
      const db = await peer.createDatabase();
      const feed = db.add(Feed.make({ name: 'people' }));

      const john = Obj.make(TestSchema.Person, { name: 'john' });
      await db.appendToFeed(feed, [john]);

      Obj.update(john, (john) => {
        john.name = 'john v2';
      });
      expect(john.name).toEqual('john v2');

      expect(() => {
        (john as any).name = 'john v3';
      }).toThrow();
    });

    test('Obj.update persists: flush then a fresh query returns the same instance with the update', async ({
      expect,
    }) => {
      await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
      const db = await peer.createDatabase();
      const feed = db.add(Feed.make({ name: 'people' }));

      const john = Obj.make(TestSchema.Person, { name: 'john' });
      await db.appendToFeed(feed, [john]);

      Obj.update(john, (john) => {
        john.name = 'john v2';
      });
      await db.flush();

      const [result] = await queryFeed(db, feed, Filter.everything()).run();
      expect(result.name).toEqual('john v2');
      expect(result).toBe(john);
    });

    test('Obj.update survives reload', async ({ expect }) => {
      await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
      const db = await peer.createDatabase();
      const feed = db.add(Feed.make({ name: 'people' }));
      await db.flush();

      const john = Obj.make(TestSchema.Person, { name: 'john' });
      await db.appendToFeed(feed, [john]);
      Obj.update(john, (john) => {
        john.name = 'john v2';
      });
      await db.flush();

      await peer.reload();

      const db2 = await peer.openLastDatabase();
      const [feed2] = await db2.query(Filter.type(Feed.Feed)).run();
      const [result] = await queryFeed(db2, feed2, Filter.everything()).run();
      expect(result.name).toEqual('john v2');
    });

    test('identity: consecutive queries and the appended proxy are the same instance', async ({ expect }) => {
      await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
      const db = await peer.createDatabase();
      const feed = db.add(Feed.make({ name: 'people' }));

      const john = Obj.make(TestSchema.Person, { name: 'john' });
      await db.appendToFeed(feed, [john]);

      const [first] = await queryFeed(db, feed, Filter.everything()).run();
      const [second] = await queryFeed(db, feed, Filter.everything()).run();
      expect(first).toBe(john);
      expect(second).toBe(john);
    });

    test('reactivity: Obj.subscribe fires on Obj.update and on a re-append-by-id, updating in place', async ({
      expect,
    }) => {
      await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
      const db = await peer.createDatabase();
      const feed = db.add(Feed.make({ name: 'people' }));

      const john = Obj.make(TestSchema.Person, { name: 'john' });
      await db.appendToFeed(feed, [john]);

      let notified = 0;
      const unsubscribe = Entity.subscribe(john, () => {
        notified++;
      });

      Obj.update(john, (john) => {
        john.name = 'john v2';
      });
      expect(notified).toEqual(1);

      // Re-appending by id is an update: the working-set instance (`john`) updates in place —
      // locks in PR #12226's contract against the unified working set.
      await db.appendToFeed(feed, [Obj.make(TestSchema.Person, { id: john.id, name: 'john v3' })]);
      expect(notified).toEqual(2);
      expect(john.name).toEqual('john v3');

      const [result] = await queryFeed(db, feed, Filter.everything()).run();
      expect(result).toBe(john);
      unsubscribe();
    });

    test('coalescing: N synchronous Obj.update calls flush as a single feed block', async ({ expect }) => {
      await using peer = await builder.createPeer({
        types: [Feed.Feed, TestSchema.Person],
        assignQueuePositions: true,
      });
      const db = await peer.createDatabase();
      const feed = db.add(Feed.make({ name: 'people' }));

      const john = Obj.make(TestSchema.Person, { name: 'john' });
      await db.appendToFeed(feed, [john]);
      await db.flush();

      const [before] = await queryFeed(db, feed, Filter.everything()).run();
      const positionBefore = Number(Entity.getKeys(before, FeedProtocol.KEY_QUEUE_POSITION).at(0)?.id);

      Obj.update(john, (john) => {
        john.name = 'john v2';
      });
      Obj.update(john, (john) => {
        john.name = 'john v3';
      });
      Obj.update(john, (john) => {
        john.name = 'john v4';
      });
      await db.flush();

      const [after] = await queryFeed(db, feed, Filter.everything()).run();
      const positionAfter = Number(Entity.getKeys(after, FeedProtocol.KEY_QUEUE_POSITION).at(0)?.id);

      expect(after.name).toEqual('john v4');
      expect(positionAfter - positionBefore).toEqual(1);
    });

    test('reconciliation does not clobber a not-yet-flushed local update', async ({ expect }) => {
      await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
      const db = await peer.createDatabase();
      const feed = db.add(Feed.make({ name: 'people' }));

      const john = Obj.make(TestSchema.Person, { name: 'john' });
      const jane = Obj.make(TestSchema.Person, { name: 'jane' });
      await db.appendToFeed(feed, [john, jane]);
      await db.flush();

      Obj.update(john, (john) => {
        john.name = 'john v2';
      });

      // Force an index emission (a reactive query re-evaluation) via an unrelated append, without
      // flushing john's own pending update.
      const query = queryFeed(db, feed, Filter.everything());
      const called = new Event();
      const calledOnce = called.waitForCount(1);
      const sub = query.subscribe(() => called.emit());
      await db.appendToFeed(feed, [Obj.make(TestSchema.Person, { id: jane.id, name: 'jane v2' })]);
      await calledOnce;
      sub();

      // The local, not-yet-flushed update to john must survive the unrelated index emission.
      expect(john.name).toEqual('john v2');

      await db.flush();
      const [johnResult] = await queryFeed(db, feed, Filter.id(john.id)).run();
      expect(johnResult.name).toEqual('john v2');
    });

    test('delete interplay: Obj.update after delete does not throw or resurrect; re-append after delete works', async ({
      expect,
    }) => {
      await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
      const db = await peer.createDatabase();
      const feed = db.add(Feed.make({ name: 'people' }));

      const john = Obj.make(TestSchema.Person, { name: 'john' });
      await db.appendToFeed(feed, [john]);
      await db.flush();

      await db.removeFeedItemsByIds(feed, [john.id]);

      expect(() => {
        Obj.update(john, (john) => {
          john.name = 'ghost';
        });
      }).not.toThrow();

      let results = await queryFeed(db, feed, Filter.everything()).run();
      expect(results).toHaveLength(0);

      await db.appendToFeed(feed, [Obj.make(TestSchema.Person, { id: john.id, name: 'john reborn' })]);
      results = await queryFeed(db, feed, Filter.everything()).run();
      expect(results).toHaveLength(1);
      expect(results[0].name).toEqual('john reborn');
    });

    test('Obj.getSnapshot is a non-live snapshot unaffected by later updates', async ({ expect }) => {
      await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
      const db = await peer.createDatabase();
      const feed = db.add(Feed.make({ name: 'people' }));

      const john = Obj.make(TestSchema.Person, { name: 'john' });
      await db.appendToFeed(feed, [john]);

      const snapshot = Obj.getSnapshot(john);
      Obj.update(john, (john) => {
        john.name = 'john v2';
      });

      expect(snapshot.name).toEqual('john');
      expect(john.name).toEqual('john v2');
    });

    test('a callback that throws partway through Obj.update leaves the partial mutation dirty and propagates', async ({
      expect,
    }) => {
      await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
      const db = await peer.createDatabase();
      const feed = db.add(Feed.make({ name: 'people' }));

      const john = Obj.make(TestSchema.Person, { name: 'john' });
      await db.appendToFeed(feed, [john]);
      await db.flush();

      expect(() => {
        Obj.update(john, (john) => {
          john.name = 'partial';
          throw new Error('boom');
        });
      }).toThrow('boom');
      expect(john.name).toEqual('partial');

      await db.flush();
      const [result] = await queryFeed(db, feed, Filter.everything()).run();
      expect(result.name).toEqual('partial');
    });

    test('concurrent db.flush() calls resolve together without hanging or double-appending', async ({ expect }) => {
      await using peer = await builder.createPeer({
        types: [Feed.Feed, TestSchema.Person],
        assignQueuePositions: true,
      });
      const db = await peer.createDatabase();
      const feed = db.add(Feed.make({ name: 'people' }));

      const john = Obj.make(TestSchema.Person, { name: 'john' });
      await db.appendToFeed(feed, [john]);
      await db.flush();

      Obj.update(john, (john) => {
        john.name = 'john v2';
      });

      await Promise.all([db.flush(), db.flush(), db.flush()]);

      const [result] = await queryFeed(db, feed, Filter.everything()).run();
      expect(result.name).toEqual('john v2');
      const position = Number(Entity.getKeys(result, FeedProtocol.KEY_QUEUE_POSITION).at(0)?.id);
      expect(position).toEqual(1);
    });

    test('two independent clients writing the same id: last flush observed wins wholesale', async ({ expect }) => {
      const [spaceKey] = PublicKey.randomSequence();
      await using peer = await builder.createPeer({
        types: [Feed.Feed, TestSchema.Person],
        assignQueuePositions: true,
      });
      await using db1 = await peer.createDatabase(spaceKey);
      const feed = db1.add(Feed.make({ name: 'people' }));

      const john = Obj.make(TestSchema.Person, { name: 'john', email: 'john@example.com' });
      await db1.appendToFeed(feed, [john]);
      await db1.flush();

      // A second client on the same space/feed gets its own independent live proxy for `john`.
      await using client2 = await peer.createClient();
      await using db2 = await peer.openDatabase(spaceKey, db1.rootUrl!, { client: client2 });
      const [feed2] = await db2.query(Filter.type(Feed.Feed)).run();
      const [john2] = await queryFeed(db2, feed2, Filter.everything()).run();
      expect(john2).not.toBe(john);

      // Both clients mutate different fields before either observes the other's write.
      Obj.update(john, (john) => {
        john.name = 'john from client1';
      });
      Obj.update(john2 as TestSchema.Person, (mutable) => {
        mutable.email = 'client2@example.com';
      });

      await db1.flush();
      await db2.flush();

      // Whole-object last-flush-wins: client2's flush (observed last) overwrites client1's field
      // too — client1's `name` edit is silently reverted even though client2 never touched `name`,
      // since client2's captured snapshot still carries the pre-edit value. This is the documented
      // data-loss mode, not a bug to "fix" without a real merge protocol.
      const [finalResult] = await queryFeed(db1, feed, Filter.everything()).run();
      expect(finalResult.email).toEqual('client2@example.com');
      expect(finalResult.name).toEqual('john');
    });
  });
});

/**
 * Queries a feed through the database with a feed scope — the canonical non-Effect feed query.
 */
const queryFeed = (db: EchoDatabase, feed: Feed.Feed, filter: Filter.Any) =>
  db.query(Query.select(filter).from(Scope.feed(Feed.getFeedUri(feed)!)));
