//
// Copyright 2022 DXOS.org
//

import * as A from '@automerge/automerge';
import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, expect, onTestFinished, test } from 'vitest';

import { Trigger, asyncTimeout, sleep } from '@dxos/async';
import {
  Aggregate,
  Collection,
  Dataset,
  type Entity,
  Feed,
  Filter,
  GroupKey,
  type Hypergraph,
  Obj,
  Order,
  Query,
  type QueryResult,
  Ref,
  Relation,
  Scope,
  Type,
  View,
} from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-client';
import { EchoTestBuilder, type EchoTestPeer, createTmpPath, getObjectCore } from '@dxos/echo-client/testing';
import { type DatabaseDirectory } from '@dxos/echo-protocol';
import { TestSchema } from '@dxos/echo/testing';
import { DXN, EID, EntityId, PublicKey, URI } from '@dxos/keys';
import { log } from '@dxos/log';
import { random } from '@dxos/random';
import { range } from '@dxos/util';

random.seed(1);

// Tag ids are the URIs of Tag objects; meta stores them as refs.
const tags = ['echo:/TAGRED', 'echo:/TAGGREEN', 'echo:/TAGBLUE'];
const tagRefs = tags.map((uri) => Ref.fromURI(URI.make(uri)));

Obj.make(TestSchema.Expando, { foo: 100 });

type ObjectProps = {
  [Obj.Meta]?: { tags?: Ref.Ref<any>[]; key?: string; version?: string };
  value?: number;
};

const createTestObject = (props: ObjectProps = {}) => {
  return Obj.make(TestSchema.Expando, {
    title: random.commerce.productName(),
    ...props,
  });
};

const createTestObjects = () => {
  return new Array<Entity.Any>()
    .concat(range(1).map(() => createTestObject()))
    .concat(
      range(3).map(() =>
        createTestObject({
          value: 100,
        }),
      ),
    )
    .concat(
      range(2).map((i) =>
        createTestObject({
          value: 200,
          [Obj.Meta]: { tags: tagRefs.slice(i) },
        }),
      ),
    )
    .concat(
      range(4).map((i) =>
        createTestObject({
          value: 300,
          [Obj.Meta]: { tags: tagRefs.slice(i + 1) },
        }),
      ),
    );
};

describe('Query', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  describe('Query with different filters', () => {
    let db: EchoDatabase;

    beforeEach(async () => {
      ({ db } = await builder.createDatabase({ types: [Feed.Feed, Collection.Collection, View.View] }));
      createTestObjects().forEach((object) => db.add(object));
      await db.flush();
    });

    test('query nothing', async () => {
      const objects = await db.query(Query.select(Filter.nothing())).run();
      expect(objects).to.have.length(0);
    });

    test('query everything', async () => {
      const objects = await db.query(Query.select(Filter.everything())).run();
      expect(objects).to.have.length(10);
    });

    test('order by natural', async () => {
      const objects = await db.query(Query.select(Filter.everything())).run();
      const sortedObjects = objects.sort((a, b) => a.id.localeCompare(b.id));
      expect(objects.map((obj) => obj.id)).to.deep.equal(sortedObjects.map((obj) => obj.id));
    });

    test('order by property', async () => {
      const objects = await db.query(Query.select(Filter.everything()).orderBy(Order.property('label', 'asc'))).run();
      const sortedObjects = objects.sort((a, b) => a.label?.localeCompare(b.label));
      expect(objects.map((obj) => obj.label)).to.deep.equal(sortedObjects.map((obj) => obj.label));
    });

    test('order by property descending', async () => {
      const objects = await db.query(Query.select(Filter.everything()).orderBy(Order.property('label', 'desc'))).run();
      const sortedObjects = objects.sort((a, b) => b.label?.localeCompare(a.label));
      expect(objects.map((obj) => obj.label)).to.deep.equal(sortedObjects.map((obj) => obj.label));
    });

    test('limit results', async () => {
      const objects = await db.query(Query.select(Filter.everything()).limit(5)).run();
      expect(objects).to.have.length(5);
    });

    test('limit with ordering', async () => {
      const allObjects = await db.query(Query.select(Filter.everything()).orderBy(Order.natural())).run();
      const limitedObjects = await db.query(Query.select(Filter.everything()).orderBy(Order.natural()).limit(3)).run();

      expect(limitedObjects).to.have.length(3);
      // Verify the results are ordered consistently.
      const limitedIds = limitedObjects.map((obj) => obj.id);
      const sortedLimitedIds = [...limitedIds].sort();
      expect(limitedIds).to.deep.equal(sortedLimitedIds);
      // Verify the limited results are a subset of all results.
      const allIds = new Set(allObjects.map((obj) => obj.id));
      for (const id of limitedIds) {
        expect(allIds.has(id)).to.be.true;
      }
    });

    test('limit larger than result set returns all results', async () => {
      const objects = await db.query(Query.select(Filter.everything()).limit(100)).run();
      expect(objects).to.have.length(10);
    });

    test('filter by type', async () => {
      {
        const objects = await db.query(Query.select(Filter.type(TestSchema.Expando, { value: undefined }))).run();
        expect(objects).to.have.length(1);
      }

      {
        const objects = await db.query(Query.select(Filter.type(TestSchema.Expando, { value: 100 }))).run();
        expect(objects).to.have.length(3);
      }

      {
        const objects = await db.query(Query.select(Filter.type(TestSchema.Expando, { value: 400 }))).run();
        expect(objects).to.have.length(0);
      }
    });

    test('filter by tag', async () => {
      {
        const objects = await db.query(Query.select(Filter.tag(tags[1]))).run();
        expect(objects).to.have.length(3);
      }

      {
        const objects = await db.query(Query.select(Filter.tag('bananas'))).run();
        expect(objects).to.have.length(0);
      }
    });

    test('filter expando', async () => {
      const objects = await db.query(Query.select(Filter.type(TestSchema.Expando, { value: 100 }))).run();
      expect(objects).to.have.length(3);
    });

    test('filter by reference', async () => {
      const objA = db.add(Obj.make(TestSchema.Expando, { value: 100 }));
      const objB = db.add(Obj.make(TestSchema.Expando, { value: 200, ref: Ref.make(objA) }));
      await db.flush();

      const objects = await db.query(Filter.type(TestSchema.Expando, { ref: Ref.make(objA) })).run();
      expect(objects).toEqual([objB]);
    });

    test('filter by foreign keys', async () => {
      const obj = Obj.make(TestSchema.Expando, { value: 100 });
      Obj.update(obj, (obj) => Obj.getMeta(obj).keys.push({ id: 'test-id', source: 'test-source' }));
      db.add(obj);

      await db.flush();
      const objects = await db
        .query(Filter.foreignKeys(TestSchema.Expando, [{ id: 'test-id', source: 'test-source' }]))
        .run();
      expect(objects).toEqual([obj]);
    });

    test('filter by meta key', async ({ expect }) => {
      const target = db.add(
        Obj.make(TestSchema.Expando, {
          [Obj.Meta]: { key: 'org.example.type.foo', version: '1.2.3' },
          value: 42,
        }),
      );
      db.add(
        Obj.make(TestSchema.Expando, {
          [Obj.Meta]: { key: 'org.example.type.bar', version: '1.2.3' },
          value: 43,
        }),
      );
      await db.flush();

      const objects = await db.query(Filter.key('org.example.type.foo')).run();
      expect(objects).toEqual([target]);
    });

    test('filter by meta key matches any version when range omitted', async ({ expect }) => {
      const matchingA = db.add(
        Obj.make(TestSchema.Expando, {
          [Obj.Meta]: { key: 'org.example.type.foo', version: '1.0.0' },
          value: 1,
        }),
      );
      const matchingB = db.add(
        Obj.make(TestSchema.Expando, {
          [Obj.Meta]: { key: 'org.example.type.foo' },
          value: 2,
        }),
      );
      db.add(
        Obj.make(TestSchema.Expando, {
          [Obj.Meta]: { key: 'org.example.type.other', version: '1.0.0' },
          value: 3,
        }),
      );
      await db.flush();

      const objects = await db.query(Filter.key('org.example.type.foo')).run();
      expect(new Set(objects.map((o) => o.id))).toEqual(new Set([matchingA.id, matchingB.id]));
    });

    test('filter by meta key with semver caret range', async ({ expect }) => {
      const match = db.add(
        Obj.make(TestSchema.Expando, {
          [Obj.Meta]: { key: 'org.example.type.foo', version: '1.5.0' },
          value: 1,
        }),
      );
      db.add(
        Obj.make(TestSchema.Expando, {
          [Obj.Meta]: { key: 'org.example.type.foo', version: '2.0.0' },
          value: 2,
        }),
      );
      db.add(
        Obj.make(TestSchema.Expando, {
          [Obj.Meta]: { key: 'org.example.type.foo', version: '1.0.0' },
          value: 3,
        }),
      );
      await db.flush();

      const objects = await db.query(Filter.key('org.example.type.foo', { version: '^1.2.3' })).run();
      expect(objects).toEqual([match]);
    });

    test('filter by meta key with semver tilde range', async ({ expect }) => {
      const match = db.add(
        Obj.make(TestSchema.Expando, {
          [Obj.Meta]: { key: 'org.example.type.foo', version: '1.2.7' },
          value: 1,
        }),
      );
      db.add(
        Obj.make(TestSchema.Expando, {
          [Obj.Meta]: { key: 'org.example.type.foo', version: '1.3.0' },
          value: 2,
        }),
      );
      await db.flush();

      const objects = await db.query(Filter.key('org.example.type.foo', { version: '~1.2.3' })).run();
      expect(objects).toEqual([match]);
    });

    test('filter by meta key excludes objects without version when range specified', async ({ expect }) => {
      db.add(
        Obj.make(TestSchema.Expando, {
          [Obj.Meta]: { key: 'org.example.type.foo' },
          value: 1,
        }),
      );
      await db.flush();

      const objects = await db.query(Filter.key('org.example.type.foo', { version: '^1.0.0' })).run();
      expect(objects).toEqual([]);
    });

    test('filter by foreign keys without flushing index', async () => {
      const obj = Obj.make(TestSchema.Expando, { value: 100 });
      Obj.update(obj, (obj) => Obj.getMeta(obj).keys.push({ id: 'test-id', source: 'test-source' }));
      db.add(obj);

      const objects = await db
        .query(Filter.foreignKeys(TestSchema.Expando, [{ id: 'test-id', source: 'test-source' }]))
        .run();
      expect(objects).toEqual([obj]);
    });

    test('filter nothing', async () => {
      const objects = await db.query(Filter.nothing()).run();
      expect(objects).toHaveLength(0);
    });

    test('options', async () => {
      {
        const objects = await db.query(Query.select(Filter.type(TestSchema.Expando, { value: 100 }))).run();
        expect(objects).to.have.length(3);
        for (const object of objects) {
          db.remove(object);
        }
        await db.flush();
      }

      {
        const objects = await db.query(Query.select(Filter.everything())).run();
        expect(objects).to.have.length(7);
      }

      {
        const objects = await db.query(Query.select(Filter.everything()).options({ deleted: 'exclude' })).run();
        expect(objects).to.have.length(7);
      }

      {
        const objects = await db.query(Query.select(Filter.everything()).options({ deleted: 'include' })).run();
        expect(objects).to.have.length(10);
      }

      {
        const objects = await db.query(Query.select(Filter.everything()).options({ deleted: 'only' })).run();
        expect(objects).to.have.length(3);
      }
    });

    test('enumerate datasets', async () => {
      db.add(Feed.make({ name: 'test-feed' }));
      db.add(Collection.make({ name: 'test-collection' }));
      db.add(View.make({}));
      await db.flush();

      const datasets = await db.query(Query.type(Dataset.Dataset)).run();
      expect(datasets).to.have.length(3);
    });
  });

  describe('groupBy', () => {
    test('groups by a single property, with per-group counts', async () => {
      const { db } = await builder.createDatabase();
      db.add(Obj.make(TestSchema.Expando, { value: 100 }));
      db.add(Obj.make(TestSchema.Expando, { value: 100 }));
      db.add(Obj.make(TestSchema.Expando, { value: 200 }));
      await db.flush();

      const groups = await db.query(Query.select(Filter.everything()).groupBy(GroupKey.property('value'))).run();

      expect(groups).to.have.length(2);
      const byKey = new Map(groups.map((group) => [group.key.value, group]));
      expect(byKey.get(100)?.count).to.equal(2);
      expect(byKey.get(100)?.values).to.have.length(2);
      expect(byKey.get(200)?.count).to.equal(1);
      expect(byKey.get(200)?.values).to.have.length(1);
    });

    test('groups by multiple properties (composite key)', async () => {
      const { db } = await builder.createDatabase();
      db.add(Obj.make(TestSchema.Expando, { category: 'a', value: 1 }));
      db.add(Obj.make(TestSchema.Expando, { category: 'a', value: 1 }));
      db.add(Obj.make(TestSchema.Expando, { category: 'a', value: 2 }));
      db.add(Obj.make(TestSchema.Expando, { category: 'b', value: 1 }));
      await db.flush();

      const groups = await db
        .query(Query.select(Filter.everything()).groupBy(GroupKey.property('category'), GroupKey.property('value')))
        .run();

      expect(groups).to.have.length(3);
      expect(
        groups
          .map((group) => group.count)
          .slice()
          .sort(),
      ).to.deep.equal([1, 1, 2]);
      const aOneGroup = groups.find((group) => group.key.category === 'a' && group.key.value === 1);
      expect(aOneGroup?.count).to.equal(2);
    });

    test('missing or non-scalar property values group together under the null key', async () => {
      const { db } = await builder.createDatabase();
      db.add(Obj.make(TestSchema.Expando, { value: 100 }));
      db.add(Obj.make(TestSchema.Expando, {}));
      db.add(Obj.make(TestSchema.Expando, { value: { nested: true } }));
      await db.flush();

      const groups = await db.query(Query.select(Filter.everything()).groupBy(GroupKey.property('value'))).run();

      expect(groups).to.have.length(2);
      const nullGroup = groups.find((group) => group.key.value === null);
      expect(nullGroup?.count).to.equal(2);
    });

    test('empty result set produces no groups', async () => {
      const { db } = await builder.createDatabase();
      await db.flush();

      const groups = await db.query(Query.select(Filter.nothing()).groupBy(GroupKey.property('value'))).run();
      expect(groups).to.deep.equal([]);
    });

    test('orderBy before groupBy controls within-group order', async () => {
      const { db } = await builder.createDatabase();
      db.add(Obj.make(TestSchema.Expando, { category: 'a', rank: 2 }));
      db.add(Obj.make(TestSchema.Expando, { category: 'a', rank: 1 }));
      db.add(Obj.make(TestSchema.Expando, { category: 'a', rank: 3 }));
      await db.flush();

      const groups = await db
        .query(
          Query.select(Filter.everything())
            .orderBy(Order.property('rank', 'asc'))
            .groupBy(GroupKey.property('category')),
        )
        .run();

      expect(groups).to.have.length(1);
      expect(groups[0].values.map((obj) => obj.rank)).to.deep.equal([1, 2, 3]);
    });

    test('orderBy the key property before groupBy yields key-ascending group order', async () => {
      const { db } = await builder.createDatabase();
      db.add(Obj.make(TestSchema.Expando, { category: 'c' }));
      db.add(Obj.make(TestSchema.Expando, { category: 'a' }));
      db.add(Obj.make(TestSchema.Expando, { category: 'b' }));
      await db.flush();

      const groups = await db
        .query(
          Query.select(Filter.everything())
            .orderBy(Order.property('category', 'asc'))
            .groupBy(GroupKey.property('category')),
        )
        .run();

      expect(groups.map((group) => group.key.category)).to.deep.equal(['a', 'b', 'c']);
    });

    test('threads ordered by most recent message (group order follows the preceding orderBy, not the key)', async () => {
      const { db } = await builder.createDatabase();
      const makeMessage = (threadId: string, sentAt: number) => Obj.make(TestSchema.Expando, { threadId, sentAt });

      db.add(makeMessage('thread-a', 1000));
      db.add(makeMessage('thread-b', 3000));
      db.add(makeMessage('thread-a', 2000));
      db.add(makeMessage('thread-c', 1500));
      db.add(makeMessage('thread-b', 4000));
      await db.flush();

      const groups = await db
        .query(
          Query.select(Filter.everything())
            .orderBy(Order.property('sentAt', 'desc'))
            .groupBy(GroupKey.property('threadId')),
        )
        .run();

      // Groups ordered by each thread's most recent message: thread-b (4000), thread-a (2000), thread-c (1500).
      expect(groups.map((group) => group.key.threadId)).to.deep.equal(['thread-b', 'thread-a', 'thread-c']);
      // Messages within each group are newest-first.
      expect(groups[0].values.map((obj) => obj.sentAt)).to.deep.equal([4000, 3000]);
      expect(groups[1].values.map((obj) => obj.sentAt)).to.deep.equal([2000, 1000]);
      expect(groups[2].values.map((obj) => obj.sentAt)).to.deep.equal([1500]);
    });

    test('orders threads by a max aggregate, in both directions, independent of within-group order', async () => {
      const { db } = await builder.createDatabase();
      const makeMessage = (threadId: string, sentAt: number) => Obj.make(TestSchema.Expando, { threadId, sentAt });
      // thread-a latest 2000, thread-b latest 4000, thread-c latest 1500.
      db.add(makeMessage('thread-a', 1000));
      db.add(makeMessage('thread-b', 3000));
      db.add(makeMessage('thread-a', 2000));
      db.add(makeMessage('thread-c', 1500));
      db.add(makeMessage('thread-b', 4000));
      await db.flush();

      const grouped = Query.select(Filter.everything())
        .orderBy(Order.property('sentAt', 'desc'))
        .groupBy(GroupKey.property('threadId'))
        .aggregate({ latest: Aggregate.max('sentAt') });

      // Descending by latest message.
      const desc = await db.query(grouped.orderBy(Order.aggregate('latest', 'desc'))).run();
      expect(desc.map((group) => group.key.threadId)).to.deep.equal(['thread-b', 'thread-a', 'thread-c']);
      expect(desc.map((group) => group.aggregates.latest)).to.deep.equal([4000, 2000, 1500]);
      // Members stay newest-first regardless of the group sort direction.
      expect(desc[0].values.map((obj) => obj.sentAt)).to.deep.equal([4000, 3000]);

      // Ascending reverses threads by latest message (not by oldest message), members unchanged.
      const asc = await db.query(grouped.orderBy(Order.aggregate('latest', 'asc'))).run();
      expect(asc.map((group) => group.key.threadId)).to.deep.equal(['thread-c', 'thread-a', 'thread-b']);
      expect(asc.map((group) => group.aggregates.latest)).to.deep.equal([1500, 2000, 4000]);
      expect(asc[2].values.map((obj) => obj.sentAt)).to.deep.equal([4000, 3000]);
    });

    test('a min aggregate exposes the earliest member and can order groups', async () => {
      const { db } = await builder.createDatabase();
      const makeMessage = (threadId: string, sentAt: number) => Obj.make(TestSchema.Expando, { threadId, sentAt });
      db.add(makeMessage('thread-a', 1000));
      db.add(makeMessage('thread-a', 5000));
      db.add(makeMessage('thread-b', 2000));
      db.add(makeMessage('thread-b', 3000));
      await db.flush();

      const groups = await db
        .query(
          Query.select(Filter.everything())
            .orderBy(Order.property('sentAt', 'desc'))
            .groupBy(GroupKey.property('threadId'))
            .aggregate({ earliest: Aggregate.min('sentAt') })
            .orderBy(Order.aggregate('earliest', 'asc')),
        )
        .run();

      // Ordered by each thread's earliest message: thread-a (1000) then thread-b (2000).
      expect(groups.map((group) => group.key.threadId)).to.deep.equal(['thread-a', 'thread-b']);
      expect(groups.map((group) => group.aggregates.earliest)).to.deep.equal([1000, 2000]);
    });

    test('aggregate ordering pages over whole groups (limit + skip)', async () => {
      const { db } = await builder.createDatabase();
      const makeMessage = (threadId: string, sentAt: number) => Obj.make(TestSchema.Expando, { threadId, sentAt });
      // Four threads whose latest messages are a:100, b:400, c:300, d:200.
      db.add(makeMessage('a', 50));
      db.add(makeMessage('a', 100));
      db.add(makeMessage('b', 400));
      db.add(makeMessage('c', 300));
      db.add(makeMessage('d', 200));
      await db.flush();

      const page = await db
        .query(
          Query.select(Filter.everything())
            .orderBy(Order.property('sentAt', 'desc'))
            .groupBy(GroupKey.property('threadId'))
            .aggregate({ latest: Aggregate.max('sentAt') })
            .orderBy(Order.aggregate('latest', 'desc'))
            .skip(1)
            .limit(2),
        )
        .run();

      // Groups by latest desc = b(400), c(300), d(200), a(100); skip 1, take 2 → c, d.
      expect(page.map((group) => group.key.threadId)).to.deep.equal(['c', 'd']);
    });

    test('limit applies to the flat stream before grouping', async () => {
      const { db } = await builder.createDatabase();
      db.add(Obj.make(TestSchema.Expando, { category: 'a', rank: 1 }));
      db.add(Obj.make(TestSchema.Expando, { category: 'a', rank: 2 }));
      db.add(Obj.make(TestSchema.Expando, { category: 'b', rank: 3 }));
      await db.flush();

      const groups = await db
        .query(
          Query.select(Filter.everything())
            .orderBy(Order.property('rank', 'asc'))
            .limit(2)
            .groupBy(GroupKey.property('category')),
        )
        .run();

      // Only the first 2 (by rank) objects reach grouping: both are category 'a'.
      expect(groups).to.have.length(1);
      expect(groups[0].key.category).to.equal('a');
      expect(groups[0].count).to.equal(2);
    });

    test('limit + skip after groupBy pages over whole groups', async () => {
      const { db } = await builder.createDatabase();
      // Four categories (a..d), each with two members; ordered by rank so group order is a<b<c<d.
      let rank = 0;
      for (const category of ['a', 'a', 'b', 'b', 'c', 'c', 'd', 'd']) {
        db.add(Obj.make(TestSchema.Expando, { category, rank: rank++ }));
      }
      await db.flush();

      const page = await db
        .query(
          Query.select(Filter.everything())
            .orderBy(Order.property('rank', 'asc'))
            .groupBy(GroupKey.property('category'))
            .skip(1)
            .limit(2),
        )
        .run();

      // Skip group a, take groups b and c — as whole groups (each still has its 2 members).
      expect(page.map((group) => group.key.category)).to.deep.equal(['b', 'c']);
      expect(page.every((group) => group.count === 2 && group.values.length === 2)).to.be.true;
    });


    describe('reactivity', () => {
      // Grouped queries are index-backed (like order/limit queries), so `.runSync()`/`.results`
      // only reflect real data after the first reactive round-trip completes; wait for it before
      // asserting, following the pattern used for other index-only reactive queries in this file.
      const subscribeAndWaitForFirstResult = async <T>(query: QueryResult.QueryResult<T>): Promise<T[]> => {
        let lastResult: T[] = [];
        const initial = new Trigger();
        let fired = false;
        const unsubscribe = query.subscribe(() => {
          lastResult = query.results;
          if (!fired) {
            fired = true;
            initial.wake();
          }
        });
        await initial.wait();
        onTestFinished(unsubscribe);
        return lastResult;
      };

      test('adding an object creates a new group / updates counts', async () => {
        const { db } = await builder.createDatabase();
        db.add(Obj.make(TestSchema.Expando, { category: 'a' }));
        await db.flush();

        const query = db.query(Query.select(Filter.everything()).groupBy(GroupKey.property('category')));
        let lastResult = await subscribeAndWaitForFirstResult(query);
        expect(lastResult).to.have.length(1);

        db.add(Obj.make(TestSchema.Expando, { category: 'b' }));
        await db.flush({ updates: true });
        lastResult = query.results;

        expect(lastResult).to.have.length(2);
        expect(lastResult.find((group) => group.key.category === 'b')?.count).to.equal(1);

        db.add(Obj.make(TestSchema.Expando, { category: 'a' }));
        await db.flush({ updates: true });
        lastResult = query.results;

        expect(lastResult.find((group) => group.key.category === 'a')?.count).to.equal(2);
      });

      test('property edit moves an object between groups, including the same-flat-index boundary case', async () => {
        const { db } = await builder.createDatabase();
        // Ordering by `rank` keeps these two objects adjacent; editing the boundary object's
        // category moves it into the other group without changing its position in the flat stream.
        const boundary = db.add(Obj.make(TestSchema.Expando, { category: 'a', rank: 1 }));
        db.add(Obj.make(TestSchema.Expando, { category: 'b', rank: 2 }));
        await db.flush();

        const query = db.query(
          Query.select(Filter.everything())
            .orderBy(Order.property('rank', 'asc'))
            .groupBy(GroupKey.property('category')),
        );
        const initialResult = await subscribeAndWaitForFirstResult(query);
        expect(initialResult).to.have.length(2);

        Obj.update(boundary, (boundary) => {
          boundary.category = 'b';
        });
        await db.flush({ updates: true });
        const lastResult = query.results;

        expect(lastResult).to.have.length(1);
        expect(lastResult[0].key.category).to.equal('b');
        expect(lastResult[0].count).to.equal(2);
      });

      test('deleting the last object in a group removes the group', async () => {
        const { db } = await builder.createDatabase();
        const obj = db.add(Obj.make(TestSchema.Expando, { category: 'a' }));
        db.add(Obj.make(TestSchema.Expando, { category: 'b' }));
        await db.flush();

        const query = db.query(Query.select(Filter.everything()).groupBy(GroupKey.property('category')));
        const initialResult = await subscribeAndWaitForFirstResult(query);
        expect(initialResult).to.have.length(2);

        db.remove(obj);
        await db.flush({ updates: true });
        const lastResult = query.results;

        expect(lastResult).to.have.length(1);
        expect(lastResult[0].key.category).to.equal('b');
      });
    });

    test('run() matches subscribed results', async () => {
      const { db } = await builder.createDatabase();
      db.add(Obj.make(TestSchema.Expando, { category: 'a' }));
      db.add(Obj.make(TestSchema.Expando, { category: 'a' }));
      db.add(Obj.make(TestSchema.Expando, { category: 'b' }));
      await db.flush();

      const query = db.query(Query.select(Filter.everything()).groupBy(GroupKey.property('category')));

      const initial = new Trigger();
      const unsubscribe = query.subscribe(() => initial.wake());
      await initial.wait();
      onTestFinished(unsubscribe);

      const subscribed = query.results;
      const ran = await query.run();

      expect(ran.map((group) => group.key.category).sort()).to.deep.equal(
        subscribed.map((group) => group.key.category).sort(),
      );
      expect(ran.map((group) => group.count).sort()).to.deep.equal(subscribed.map((group) => group.count).sort());
    });

    test('grouped queries participate in the result/atom cache like ordinary queries', async () => {
      const { db } = await builder.createDatabase();

      const first = db.query(Query.select(Filter.everything()).groupBy(GroupKey.property('category')));
      const second = db.query(Query.select(Filter.everything()).groupBy(GroupKey.property('category')));
      expect(second).toBe(first);
      expect(second.atom).toBe(first.atom);
    });
  });

  describe('Timestamp queries', () => {
    test('updated({ after }) excludes objects created before cutoff', async () => {
      const { db } = await builder.createDatabase();
      const early = db.add(createTestObject({ value: 1 }));
      await db.flush();

      await sleep(20);
      const cutoff = Date.now();
      await sleep(20);

      const recent = db.add(createTestObject({ value: 2 }));
      await db.flush();

      const objects = await db
        .query(Query.select(Filter.and(Filter.type(TestSchema.Expando), Filter.updated({ after: cutoff }))))
        .run();
      const ids = objects.map((o) => o.id);
      expect(ids).toContain(recent.id);
      expect(ids).not.toContain(early.id);
    });

    test('created({ before }) excludes objects created after cutoff', async () => {
      const { db } = await builder.createDatabase();
      const early = db.add(createTestObject({ value: 1 }));
      await db.flush();

      await sleep(20);
      const cutoff = Date.now();
      await sleep(20);

      const late = db.add(createTestObject({ value: 2 }));
      await db.flush();

      const objects = await db
        .query(Query.select(Filter.and(Filter.type(TestSchema.Expando), Filter.created({ before: cutoff }))))
        .run();
      const ids = objects.map((o) => o.id);
      expect(ids).toContain(early.id);
      expect(ids).not.toContain(late.id);
    });

    test('updated({ after, before }) returns only objects in range', async () => {
      const { db } = await builder.createDatabase();
      const before = db.add(createTestObject({ value: 1 }));
      await db.flush();

      await sleep(20);
      const rangeStart = Date.now();
      await sleep(20);

      const middle = db.add(createTestObject({ value: 2 }));
      await db.flush();

      await sleep(20);
      const rangeEnd = Date.now();
      await sleep(20);

      const after = db.add(createTestObject({ value: 3 }));
      await db.flush();

      const objects = await db
        .query(
          Query.select(
            Filter.and(Filter.type(TestSchema.Expando), Filter.updated({ after: rangeStart, before: rangeEnd })),
          ),
        )
        .run();
      const ids = objects.map((o) => o.id);
      expect(ids).toContain(middle.id);
      expect(ids).not.toContain(before.id);
      expect(ids).not.toContain(after.id);
    });

    test('timestamp filter combined with type and property filter', async () => {
      const { db } = await builder.createDatabase();
      db.add(createTestObject({ value: 100 }));
      await db.flush();

      await sleep(20);
      const cutoff = Date.now();
      await sleep(20);

      const recent = db.add(createTestObject({ value: 200 }));
      await db.flush();

      const objects = await db
        .query(
          Query.select(Filter.and(Filter.type(TestSchema.Expando, { value: 200 }), Filter.updated({ after: cutoff }))),
        )
        .run();
      expect(objects).toHaveLength(1);
      expect(objects[0].id).toBe(recent.id);
    });

    test('updated({ after }) with future cutoff returns empty', async () => {
      const { db } = await builder.createDatabase();
      db.add(createTestObject({ value: 1 }));
      await db.flush();

      const futureCutoff = Date.now() + 60_000;
      const objects = await db
        .query(Query.select(Filter.and(Filter.type(TestSchema.Expando), Filter.updated({ after: futureCutoff }))))
        .run();
      expect(objects).toHaveLength(0);
    });

    test('updated({ after }) accepts Date objects', async () => {
      const { db } = await builder.createDatabase();
      const early = db.add(createTestObject({ value: 1 }));
      await db.flush();

      await sleep(20);
      const cutoff = new Date();
      await sleep(20);

      const recent = db.add(createTestObject({ value: 2 }));
      await db.flush();

      const objects = await db
        .query(Query.select(Filter.and(Filter.type(TestSchema.Expando), Filter.updated({ after: cutoff }))))
        .run();
      const ids = objects.map((o) => o.id);
      expect(ids).toContain(recent.id);
      expect(ids).not.toContain(early.id);
    });

    test('updated({ after }) picks up modified objects', async () => {
      const { db } = await builder.createDatabase();
      const obj = db.add(createTestObject({ value: 1 }));
      const other = db.add(createTestObject({ value: 2 }));
      await db.flush();

      // Automerge timestamps have second-level precision.
      // Wait until we cross into the next second so the modification
      // gets a strictly later timestamp than the initial indexing.
      const secondAfterFlush = Math.floor(Date.now() / 1000) + 1;
      while (Math.floor(Date.now() / 1000) < secondAfterFlush) {
        await sleep(50);
      }
      const cutoff = secondAfterFlush * 1000;

      Obj.update(obj, (obj: any) => {
        obj.value = 999;
      });
      await db.flush();

      const objects = await db
        .query(Query.select(Filter.and(Filter.type(TestSchema.Expando), Filter.updated({ after: cutoff }))))
        .run();
      const ids = objects.map((o) => o.id);
      expect(ids).toContain(obj.id);
      expect(ids).not.toContain(other.id);
    });

    test('standalone updated({ after }) without type filter', async () => {
      const { db } = await builder.createDatabase();
      const early = db.add(createTestObject({ value: 1 }));
      await db.flush();

      await sleep(20);
      const cutoff = Date.now();
      await sleep(20);

      const recent = db.add(createTestObject({ value: 2 }));
      await db.flush();

      const objects = await db.query(Query.select(Filter.updated({ after: cutoff }))).run();
      const ids = objects.map((o) => o.id);
      expect(ids).toContain(recent.id);
      expect(ids).not.toContain(early.id);
    });

    test('orderBy(Order.created(desc)) returns most-recently-created first', async () => {
      const { db } = await builder.createDatabase();
      const first = db.add(createTestObject({ value: 1 }));
      await db.flush();
      // createdAt is sourced from system.createdAt (Date.now() at creation, ms precision); the
      // sleep is kept to maintain clear ordering in the index.
      await sleep(1100);
      const second = db.add(createTestObject({ value: 2 }));
      await db.flush();
      await sleep(1100);
      const third = db.add(createTestObject({ value: 3 }));
      await db.flush();

      const objects = await db.query(Query.select(Filter.everything()).orderBy(Order.created('desc'))).run();
      expect(objects.map((obj) => obj.id)).to.deep.equal([third.id, second.id, first.id]);
    });

    test('orderBy(Order.updated(desc)).limit(3) returns the most-recently-updated', async () => {
      const { db } = await builder.createDatabase();
      const objects = range(5).map((index) => db.add(createTestObject({ value: index })));
      await db.flush();

      // Touch objects in a known order; each mutation bumps updatedAt. The index derives updatedAt
      // from Automerge change time, which has 1-second resolution, so gaps must exceed 1s.
      const touchOrder = [objects[1], objects[4], objects[0]];
      for (const object of touchOrder) {
        await sleep(1100);
        Obj.update(object, (object: any) => {
          object.value = (object.value ?? 0) + 100;
        });
        await db.flush();
      }

      const recent = await db.query(Query.select(Filter.everything()).orderBy(Order.updated('desc')).limit(3)).run();
      expect(recent).to.have.length(3);
      // Most-recently-touched first.
      expect(recent.map((obj) => obj.id)).to.deep.equal([objects[0].id, objects[4].id, objects[1].id]);
    });

    test('Obj.getMeta(obj).createdAt is set on object creation', async () => {
      const { db } = await builder.createDatabase();
      const before = Date.now();
      const obj = db.add(createTestObject({ value: 42 }));
      const after = Date.now();
      await db.flush();

      const createdAt = Obj.getMeta(obj).createdAt;
      expect(createdAt).toBeDefined();
      expect(createdAt).toBeGreaterThanOrEqual(before);
      expect(createdAt).toBeLessThanOrEqual(after);
    });

    test('Obj.getMeta(obj).updatedAt reflects the automerge change graph', async () => {
      const { db } = await builder.createDatabase();
      const obj = db.add(createTestObject({ value: 1 }));
      await db.flush();

      const updatedAt = Obj.getMeta(obj).updatedAt;
      expect(updatedAt).toBeDefined();
      expect(typeof updatedAt).toBe('number');
      // updatedAt is derived from automerge (second-level precision); must be positive.
      expect(updatedAt).toBeGreaterThan(0);
    });

    test('Obj.getMeta(obj).updatedAt increases after Obj.update', async () => {
      const { db } = await builder.createDatabase();
      const obj = db.add(createTestObject({ value: 1 }));
      await db.flush();

      const before = Obj.getMeta(obj).updatedAt;
      await sleep(1100); // automerge change timestamps have 1-second resolution.
      Obj.update(obj, (obj: any) => {
        obj.value = 2;
      });
      await db.flush();

      const after = Obj.getMeta(obj).updatedAt;
      expect(after).toBeGreaterThan(before!);
    });

    test('createdAt is immutable — stays fixed after Obj.update', async () => {
      const { db } = await builder.createDatabase();
      const obj = db.add(createTestObject({ value: 1 }));
      await db.flush();

      const originalCreatedAt = Obj.getMeta(obj).createdAt;
      await sleep(1100);
      Obj.update(obj, (obj: any) => {
        obj.value = 2;
      });
      await db.flush();

      expect(Obj.getMeta(obj).createdAt).toBe(originalCreatedAt);
    });

    test('timestamps survive peer reload', async () => {
      const reloadBuilder = new EchoTestBuilder();
      onTestFinished(async () => {
        await reloadBuilder.close();
      });
      const { peer, db: initialDb } = await reloadBuilder.createDatabase();

      const obj = initialDb.add(createTestObject({ value: 1 }));
      await initialDb.flush();
      await initialDb.updateIndexes();

      const createdAt = Obj.getMeta(obj).createdAt;
      const objectId = obj.id;
      expect(createdAt).toBeDefined();

      await peer.reload();

      const db = await peer.openLastDatabase();
      await db.flush();
      await db.updateIndexes();

      const results = await db.query(Query.select(Filter.everything())).run();
      const reloaded = results.find((o) => o.id === objectId);
      expect(reloaded).toBeDefined();
      // createdAt is stored in system.createdAt in the automerge doc and must survive reload.
      expect(Obj.getMeta(reloaded!).createdAt).toBe(createdAt);
    });

    test('not(updated) throws clear error', async () => {
      const { db } = await builder.createDatabase();
      db.add(createTestObject({ value: 1 }));
      await db.flush();

      await expect(db.query(Query.select(Filter.not(Filter.updated({ after: Date.now() })))).run()).rejects.toThrow(
        /[Nn]egated timestamp/,
      );
    });

    test('not(and(type, updated)) throws clear error', async () => {
      const { db } = await builder.createDatabase();
      db.add(createTestObject({ value: 1 }));
      await db.flush();

      await expect(
        db
          .query(
            Query.select(
              Filter.not(Filter.and(Filter.type(TestSchema.Expando), Filter.updated({ after: Date.now() }))),
            ),
          )
          .run(),
      ).rejects.toThrow(/[Nn]egated timestamp/);
    });

    test('or(updated, type) throws clear error', async () => {
      const { db } = await builder.createDatabase();
      db.add(createTestObject({ value: 1 }));
      await db.flush();

      await expect(
        db.query(Query.select(Filter.or(Filter.updated({ after: Date.now() }), Filter.type(TestSchema.Expando)))).run(),
      ).rejects.toThrow(/too complex/);
    });

    test('Order.created ordering is consistent with Obj.getMeta(obj).createdAt', async ({ expect }) => {
      const { db } = await builder.createDatabase();

      // system.createdAt is Date.now() (ms precision); brief sleeps ensure distinct values.
      const obj1 = db.add(createTestObject({ value: 1 }));
      await db.flush();
      await sleep(20);
      const obj2 = db.add(createTestObject({ value: 2 }));
      await db.flush();
      await sleep(20);
      const obj3 = db.add(createTestObject({ value: 3 }));
      await db.flush();

      // Verify the Obj.getMeta API exposes strictly ordered createdAt values.
      const t1 = Obj.getMeta(obj1).createdAt!;
      const t2 = Obj.getMeta(obj2).createdAt!;
      const t3 = Obj.getMeta(obj3).createdAt!;
      expect(t1).toBeDefined();
      expect(t2).toBeGreaterThan(t1);
      expect(t3).toBeGreaterThan(t2);

      // The index-backed query ordering must agree with those timestamps.
      const ordered = await db.query(Query.select(Filter.everything()).orderBy(Order.created('desc'))).run();
      // Most-recently-created first.
      expect(ordered.map((o) => o.id)).to.deep.equal([obj3.id, obj2.id, obj1.id]);
    });

    test('Order.updated ordering is consistent with Obj.getMeta(obj).updatedAt', async ({ expect }) => {
      const { db } = await builder.createDatabase();
      const [obj1, obj2, obj3] = range(3).map((index) => db.add(createTestObject({ value: index })));
      await db.flush();

      // Mutate in a known order. Automerge timestamps have 1-second precision, so each
      // mutation needs a >1 s gap so the index assigns distinct updatedAt values.
      await sleep(1100);
      Obj.update(obj2, (obj2: any) => {
        obj2.value = 20;
      });
      await db.flush();
      await sleep(1100);
      Obj.update(obj1, (obj1: any) => {
        obj1.value = 10;
      });
      await db.flush();

      // Obj.getMeta must reflect the mutation order (obj1 newest, obj3 oldest).
      const upd1 = Obj.getMeta(obj1).updatedAt!;
      const upd2 = Obj.getMeta(obj2).updatedAt!;
      const upd3 = Obj.getMeta(obj3).updatedAt!;
      expect(upd1).toBeGreaterThan(upd2);
      expect(upd2).toBeGreaterThan(upd3);

      // The index-backed query ordering must agree with those updatedAt values.
      const recent = await db.query(Query.select(Filter.everything()).orderBy(Order.updated('desc')).limit(3)).run();
      expect(recent).to.have.length(3);
      // Most-recently-mutated first.
      expect(recent.map((o) => o.id)).to.deep.equal([obj1.id, obj2.id, obj3.id]);
    });
  });

  describe('Queue queries', () => {
    test('typeURI: versionless matches any version', async () => {
      const ContactV1 = Type.makeObject(DXN.make('com.example.type.person', '0.1.0'))(
        Schema.Struct({
          firstName: Schema.String,
          lastName: Schema.String,
        }),
      );

      const ContactV2 = Type.makeObject(DXN.make('com.example.type.person', '0.2.0'))(
        Schema.Struct({
          name: Schema.String,
        }),
      );

      const peer = await builder.createPeer({ types: [Feed.Feed, ContactV1, ContactV2] });
      const db = await peer.createDatabase();
      const feed = db.add(Feed.make({}));

      const contactV1 = Obj.make(ContactV1, { firstName: 'John', lastName: 'Doe' });
      const contactV2 = Obj.make(ContactV2, { name: 'Brian Smith' });
      await db.appendToFeed(feed, [contactV1, contactV2]);

      const both = await db
        .query(Query.select(Filter.type(DXN.make('com.example.type.person'))).from(Scope.feed(Feed.getFeedUri(feed)!)))
        .run();
      expect(both).toHaveLength(2);

      const v1 = await db
        .query(
          Query.select(Filter.type(DXN.make('com.example.type.person', '0.1.0'))).from(
            Scope.feed(Feed.getFeedUri(feed)!),
          ),
        )
        .run();
      expect(v1).toEqual([contactV1]);

      const v2 = await db
        .query(
          Query.select(Filter.type(DXN.make('com.example.type.person', '0.2.0'))).from(
            Scope.feed(Feed.getFeedUri(feed)!),
          ),
        )
        .run();
      expect(v2).toEqual([contactV2]);
    });

    test('sqlIndex: type selector loads queue-backed objects', async () => {
      const peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Task] });
      const db = await peer.createDatabase();
      const feed = db.add(Feed.make({}));

      const task = Obj.make(TestSchema.Task, { title: 'Queue type selector task' });
      await db.appendToFeed(feed, [task]);

      await db.flush();

      const obj: TestSchema.Task = await db
        .query(
          Query.select(Filter.type(TestSchema.Task, { title: 'Queue type selector task' })).from([
            Scope.feed(Feed.getFeedUri(feed)!),
          ]),
        )
        .first();

      expect(obj).toBeDefined();
      expect(obj.id).toEqual(task.id);
      expect(obj.title).toEqual('Queue type selector task');
      expect(Obj.getURI(obj)).toMatch(/^echo:\/\//);
      expect(Obj.getURI(obj)).toContain(obj.id);
    });

    test('query options with 2 spaces and 2 queues', async () => {
      const peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Task, TestSchema.Person] });

      const db1 = await peer.createDatabase();
      const feed1 = db1.add(Feed.make({}));

      const db2 = await peer.createDatabase();
      const feed2 = db2.add(Feed.make({}));

      const spaceTask1 = db1.add(Obj.make(TestSchema.Task, { title: 'space1-task' }));
      const spacePerson1 = db1.add(Obj.make(TestSchema.Person, { name: 'space1-person' }));
      const queueTask1 = Obj.make(TestSchema.Task, { title: 'queue1-task' });
      await db1.appendToFeed(feed1, [queueTask1]);

      const spaceTask2 = db2.add(Obj.make(TestSchema.Task, { title: 'space2-task' }));
      const queueTask2 = Obj.make(TestSchema.Task, { title: 'queue2-task' });
      await db2.appendToFeed(feed2, [queueTask2]);

      await db1.flush();
      await db2.flush();

      const graph = peer.client.graph;
      const bothSpaces = [db1.spaceId, db2.spaceId];

      {
        // Default: no queue options → only space objects.
        const results = await graph.query(Query.select(Filter.type(TestSchema.Task)).from([db1, db2])).run();
        const titles = results.map((r: TestSchema.Task) => r.title).sort();
        expect(titles).toEqual([spaceTask1.title, spaceTask2.title]);
      }

      {
        // allFeedsFromSpaces: true → space + all queue objects.
        const results = await graph
          .query(Query.select(Filter.type(TestSchema.Task)).from([db1, db2], { includeFeeds: true }))
          .run();
        const titles = results.map((r: TestSchema.Task) => r.title).sort();
        expect(titles).toEqual([queueTask1.title, queueTask2.title, spaceTask1.title, spaceTask2.title]);
      }

      {
        // Specific queue → space objects + only that queue's objects.
        const results = await graph
          .query(
            Query.select(Filter.type(TestSchema.Task)).from([
              ...bothSpaces.map((spaceId) => Scope.space({ id: spaceId })),
              Scope.feed(Feed.getFeedUri(feed1)!),
            ]),
          )
          .run();
        const titles = results.map((r: TestSchema.Task) => r.title).sort();
        expect(titles).toEqual([queueTask1.title, spaceTask1.title, spaceTask2.title]);
      }

      {
        // Other specific queue → space objects + only that queue's objects.
        const results = await graph
          .query(
            Query.select(Filter.type(TestSchema.Task)).from([
              ...bothSpaces.map((spaceId) => Scope.space({ id: spaceId })),
              Scope.feed(Feed.getFeedUri(feed2)!),
            ]),
          )
          .run();
        const titles = results.map((r: TestSchema.Task) => r.title).sort();
        expect(titles).toEqual([queueTask2.title, spaceTask1.title, spaceTask2.title]);
      }

      {
        // Both queues explicitly → same as allFeedsFromSpaces.
        const results = await graph
          .query(
            Query.select(Filter.type(TestSchema.Task)).from([
              ...bothSpaces.map((spaceId) => Scope.space({ id: spaceId })),
              Scope.feed(Feed.getFeedUri(feed1)!),
              Scope.feed(Feed.getFeedUri(feed2)!),
            ]),
          )
          .run();
        const titles = results.map((r: TestSchema.Task) => r.title).sort();
        expect(titles).toEqual([queueTask1.title, queueTask2.title, spaceTask1.title, spaceTask2.title]);
      }

      {
        // Single space with allFeedsFromSpaces → only that space's objects + queues.
        const results = await graph
          .query(Query.select(Filter.type(TestSchema.Task)).from(db1, { includeFeeds: true }))
          .run();
        const titles = results.map((r: TestSchema.Task) => r.title).sort();
        expect(titles).toEqual([queueTask1.title, spaceTask1.title]);
      }

      {
        // Different type filter → queue options don't affect non-matching types.
        const results = await graph
          .query(Query.select(Filter.type(TestSchema.Person)).from([db1, db2], { includeFeeds: true }))
          .run();
        expect(results).toHaveLength(1);
        expect((results[0] as TestSchema.Person).name).toEqual(spacePerson1.name);
      }
    });
  });

  describe('from() clause', () => {
    test('from(db) scopes query to that database', async () => {
      const peer = await builder.createPeer({ types: [TestSchema.Person] });
      const db1 = await peer.createDatabase();
      const db2 = await peer.createDatabase();

      db1.add(Obj.make(TestSchema.Person, { name: 'Alice' }));
      db2.add(Obj.make(TestSchema.Person, { name: 'Bob' }));
      await db1.flush();
      await db2.flush();

      const fromDb1 = await db1.query(Query.select(Filter.type(TestSchema.Person)).from(db1)).run();
      expect(fromDb1).toHaveLength(1);
      expect(fromDb1[0]).toMatchObject({ name: 'Alice' });

      const fromDb2 = await db2.query(Query.select(Filter.type(TestSchema.Person)).from(db2)).run();
      expect(fromDb2).toHaveLength(1);
      expect(fromDb2[0]).toMatchObject({ name: 'Bob' });
    });

    test('from(db) on another database overrides implicit scoping', async () => {
      const peer = await builder.createPeer({ types: [TestSchema.Person] });
      const db1 = await peer.createDatabase();
      const db2 = await peer.createDatabase();

      db1.add(Obj.make(TestSchema.Person, { name: 'Alice' }));
      db2.add(Obj.make(TestSchema.Person, { name: 'Bob' }));
      await db1.flush();
      await db2.flush();

      const result = await db1.query(Query.select(Filter.type(TestSchema.Person)).from(db2)).run();
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ name: 'Bob' });
    });

    test('from([db1, db2]) queries across multiple databases', async () => {
      const peer = await builder.createPeer({ types: [TestSchema.Person] });
      const db1 = await peer.createDatabase();
      const db2 = await peer.createDatabase();

      db1.add(Obj.make(TestSchema.Person, { name: 'Alice' }));
      db2.add(Obj.make(TestSchema.Person, { name: 'Bob' }));
      await db1.flush();
      await db2.flush();

      const result = await db1.query(Query.select(Filter.type(TestSchema.Person)).from([db1, db2])).run();
      expect(result).toHaveLength(2);
      expect(result.map((obj) => obj.name).sort()).toEqual(['Alice', 'Bob']);
    });

    test('from(all-accessible-spaces) queries all spaces via graph', async () => {
      const peer = await builder.createPeer({ types: [TestSchema.Person] });
      const db1 = await peer.createDatabase();
      const db2 = await peer.createDatabase();

      db1.add(Obj.make(TestSchema.Person, { name: 'Alice' }));
      db2.add(Obj.make(TestSchema.Person, { name: 'Bob' }));
      await db1.flush();
      await db2.flush();

      const result = await peer.client.graph
        .query(Query.select(Filter.type(TestSchema.Person)).from('all-accessible-spaces'))
        .run();
      expect(result).toHaveLength(2);
      expect(result.map((obj) => obj.name).sort()).toEqual(['Alice', 'Bob']);
    });

    test('from(db, { includeFeeds: true }) includes feeds in full-text search', async () => {
      const peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Task] });
      const db = await peer.createDatabase();
      const feed = db.add(Feed.make({}));

      db.add(Obj.make(TestSchema.Task, { title: 'Space TypeScript Task' }));
      await db.appendToFeed(feed, [Obj.make(TestSchema.Task, { title: 'Queue TypeScript Task' })]);
      await db.flush();

      const withFeeds: TestSchema.Task[] = await db
        .query(Query.select(Filter.text('TypeScript', { type: 'full-text' })).from(db, { includeFeeds: true }))
        .run();
      expect(withFeeds).toHaveLength(2);
      expect(withFeeds.map((obj) => obj.title).sort()).toEqual(['Queue TypeScript Task', 'Space TypeScript Task']);

      const withoutFeeds: TestSchema.Task[] = await db
        .query(Query.select(Filter.text('TypeScript', { type: 'full-text' })).from(db))
        .run();
      expect(withoutFeeds).toHaveLength(1);
      expect(withoutFeeds[0].title).toBe('Space TypeScript Task');
    });

    test('Filter.type with includeFeeds includes trace subspace queue results', async () => {
      const peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Task] });
      const db = await peer.createDatabase();
      // Feed queues use EID (echo://spaceId/queueId), not a DXN with ':trace:'.
      const feed = db.add(Feed.make({}));
      expect(Feed.getFeedUri(feed)!).toMatch(/^echo:\/\//);

      const traceTask = Obj.make(TestSchema.Task, { title: 'Trace Task' });
      await db.appendToFeed(feed, [traceTask]);
      await db.flush();

      const results: TestSchema.Task[] = await db
        .query(Query.select(Filter.type(TestSchema.Task)).from(db, { includeFeeds: true }))
        .run();

      const traceResult = results.find((obj) => obj.title === 'Trace Task');
      expect(traceResult).toBeDefined();
      const uriString = Obj.getURI(traceResult!);
      expect(uriString).toMatch(/^echo:\/\//);
    });

    test('Filter.text with includeFeeds includes trace subspace queue results', async () => {
      const peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Task] });
      const db = await peer.createDatabase();
      // Feed queues use EID (echo://spaceId/queueId), not a DXN with ':trace:'.
      const feed = db.add(Feed.make({}));

      const traceTask = Obj.make(TestSchema.Task, { title: 'Trace TypeScript Task' });
      await db.appendToFeed(feed, [traceTask]);
      await db.flush();

      const results: TestSchema.Task[] = await db
        .query(Query.select(Filter.text('TypeScript', { type: 'full-text' })).from(db, { includeFeeds: true }))
        .run();

      const traceResult = results.find((obj) => obj.title === 'Trace TypeScript Task');
      expect(traceResult).toBeDefined();
      const uriString = Obj.getURI(traceResult!);
      expect(uriString).toMatch(/^echo:\/\//);
    });

    test('from(all-accessible-spaces) via graph queries type across spaces', async () => {
      const peer = await builder.createPeer({ types: [TestSchema.Person, TestSchema.Task] });
      const db1 = await peer.createDatabase();
      const db2 = await peer.createDatabase();

      db1.add(Obj.make(TestSchema.Person, { name: 'Alice' }));
      db1.add(Obj.make(TestSchema.Task, { title: 'Task 1' }));
      db2.add(Obj.make(TestSchema.Person, { name: 'Bob' }));
      await db1.flush();
      await db2.flush();

      const people = await peer.client.graph
        .query(Query.select(Filter.type(TestSchema.Person)).from('all-accessible-spaces'))
        .run();
      expect(people).toHaveLength(2);
      expect(people.map((obj) => obj.name).sort()).toEqual(['Alice', 'Bob']);

      const tasks = await peer.client.graph
        .query(Query.select(Filter.type(TestSchema.Task)).from('all-accessible-spaces'))
        .run();
      expect(tasks).toHaveLength(1);
      expect(tasks[0]).toMatchObject({ title: 'Task 1' });
    });

    test('from() combined with limit', async () => {
      const peer = await builder.createPeer({ types: [TestSchema.Person] });
      const db = await peer.createDatabase();

      db.add(Obj.make(TestSchema.Person, { name: 'Alice' }));
      db.add(Obj.make(TestSchema.Person, { name: 'Bob' }));
      db.add(Obj.make(TestSchema.Person, { name: 'Charlie' }));
      await db.flush();

      const result = await db.query(Query.select(Filter.type(TestSchema.Person)).limit(2).from(db)).run();
      expect(result).toHaveLength(2);
    });

    test('from(feed) scopes query to feed items', async () => {
      const peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Task] });
      const db = await peer.createDatabase();

      // Create a feed object - its queue DXN is derived from the feed's own DXN.
      const feed = db.add(Feed.make({ name: 'test-feed' }));

      // Add items to the queue and a separate item to the space.
      db.add(Obj.make(TestSchema.Task, { title: 'Space Task' }));
      await db.appendToFeed(feed, [
        Obj.make(TestSchema.Task, { title: 'Feed Task 1' }),
        Obj.make(TestSchema.Task, { title: 'Feed Task 2' }),
      ]);
      await db.flush();

      // Query from feed should only return feed items.
      const feedResults = await db.query(Query.select(Filter.type(TestSchema.Task)).from(feed)).run();
      expect(feedResults).toHaveLength(2);
      expect(feedResults.map((obj: any) => obj.title).sort()).toEqual(['Feed Task 1', 'Feed Task 2']);
    });

    test('from(feed) with Filter.id scopes to feed', async () => {
      const peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Task] });
      const db = await peer.createDatabase();

      const feed = db.add(Feed.make({ name: 'test-feed' }));

      const feedItem = Obj.make(TestSchema.Task, { title: 'Feed Task' });
      const spaceItem = db.add(Obj.make(TestSchema.Task, { title: 'Space Task' }));
      await db.appendToFeed(feed, [feedItem]);
      await db.flush();

      // Filter.id for a feed item should find it when scoped to feed.
      const feedResult = await db.query(Query.select(Filter.id(feedItem.id)).from(feed)).run();
      expect(feedResult).toHaveLength(1);
      expect((feedResult[0] as any).title).toBe('Feed Task');

      // Filter.id for a space item should NOT find it when scoped to feed.
      const spaceResult = await db.query(Query.select(Filter.id(spaceItem.id)).from(feed)).run();
      expect(spaceResult).toHaveLength(0);
    });

    test('from(feed) with no queue DXN returns empty results', async () => {
      const peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Task] });
      const db = await peer.createDatabase();

      const feed = db.add(Feed.make({ name: 'empty-feed' }));
      db.add(Obj.make(TestSchema.Task, { title: 'Space Task' }));
      await db.flush({ indexes: true });

      const results = await db.query(Query.select(Filter.type(TestSchema.Task)).from(feed)).run();
      expect(results).toHaveLength(0);
    });

    test('from a non-existent feed scope returns empty results', async () => {
      const peer = await builder.createPeer({ types: [TestSchema.Task] });
      const db = await peer.createDatabase();

      db.add(Obj.make(TestSchema.Task, { title: 'Space Task' }));
      await db.flush({ indexes: true });

      const nonExistentFeed = 'echo://AAAAAAAAAAAAAAAAAAAAAAAAAAAA/00000000000000000000000000';
      const results = await db
        .query(Query.select(Filter.type(TestSchema.Task)).from([{ _tag: 'feed' as const, feedUri: nonExistentFeed }]))
        .run();
      expect(results).toHaveLength(0);
    });

    test('Query.type(...).from(feed) scopes query to feed items', async () => {
      const peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Task] });
      const db = await peer.createDatabase();

      const feed = db.add(Feed.make({ name: 'test-feed' }));

      db.add(Obj.make(TestSchema.Task, { title: 'Space Task' }));
      await db.appendToFeed(feed, [
        Obj.make(TestSchema.Task, { title: 'Feed Task 1' }),
        Obj.make(TestSchema.Task, { title: 'Feed Task 2' }),
      ]);
      await db.flush();

      const feedResults = await db.query(Query.type(TestSchema.Task).from(feed)).run();
      expect(feedResults).toHaveLength(2);
      expect(feedResults.map((obj: any) => obj.title).sort()).toEqual(['Feed Task 1', 'Feed Task 2']);
    });

    test('Query.select(...).from(subquery) filters results of inner query', async () => {
      const peer = await builder.createPeer({ types: [TestSchema.Person, TestSchema.Task] });
      const db = await peer.createDatabase();

      db.add(Obj.make(TestSchema.Person, { name: 'Alice' }));
      db.add(Obj.make(TestSchema.Person, { name: 'Bob' }));
      db.add(Obj.make(TestSchema.Task, { title: 'Task 1' }));
      await db.flush();

      const subquery = Query.select(Filter.type(TestSchema.Person)).from(db);
      const results = await db
        .query(Query.select(Filter.props<TestSchema.Person>({ name: 'Alice' })).from(subquery))
        .run();

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({ name: 'Alice' });
    });

    test('Query.from(db).select(...) scopes then filters', async () => {
      const peer = await builder.createPeer({ types: [TestSchema.Person, TestSchema.Task] });
      const db1 = await peer.createDatabase();
      const db2 = await peer.createDatabase();

      db1.add(Obj.make(TestSchema.Person, { name: 'Alice' }));
      db1.add(Obj.make(TestSchema.Task, { title: 'Task 1' }));
      db2.add(Obj.make(TestSchema.Person, { name: 'Bob' }));
      await db1.flush();
      await db2.flush();

      const results = await peer.client.graph.query(Query.from(db1).select(Filter.type(TestSchema.Person))).run();

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({ name: 'Alice' });
    });

    test('Query.from(subquery).reference() traverses from subquery results', async () => {
      const peer = await builder.createPeer({ types: [TestSchema.Person, TestSchema.Task] });
      const db = await peer.createDatabase();

      const alice = db.add(Obj.make(TestSchema.Person, { name: 'Alice' }));
      const bob = db.add(Obj.make(TestSchema.Person, { name: 'Bob' }));
      db.add(Obj.make(TestSchema.Task, { title: 'Task for Alice', assignee: Ref.make(alice) }));
      db.add(Obj.make(TestSchema.Task, { title: 'Task for Bob', assignee: Ref.make(bob) }));
      await db.flush();

      const subquery = Query.select(Filter.type(TestSchema.Task, { title: 'Task for Alice' })).from(db);
      const results = await db.query(Query.from(subquery).reference('assignee')).run();

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({ name: 'Alice' });
    });
  });

  test('query.run() queries everything after restart', async () => {
    const tmpPath = createTmpPath();

    const builder = new EchoTestBuilder();
    onTestFinished(async () => {
      await builder.close();
    });

    {
      const peer = await builder.createPeer({ storagePath: tmpPath });
      const db = await peer.createDatabase();
      await createObjects(peer, db, { count: 3 });

      expect((await db.query(Query.select(Filter.everything())).run()).length).to.eq(3);
      await peer.close();
    }

    {
      const peer = await builder.createPeer({ storagePath: tmpPath });
      const db = await peer.openLastDatabase();
      expect((await db.query(Query.select(Filter.everything())).run()).length).to.eq(3);
    }
  });

  test('objects with incorrect document urls are ignored', async () => {
    const tmpPath = createTmpPath();

    const builder = new EchoTestBuilder();
    onTestFinished(async () => {
      await builder.close();
    });

    let expectedObjectId: string;
    {
      const peer = await builder.createPeer({ storagePath: tmpPath });
      const db = await peer.createDatabase();
      const [obj1, obj2] = await createObjects(peer, db, { count: 2 });

      expect((await db.query(Query.select(Filter.everything())).run()).length).to.eq(2);
      const rootDocHandle = db.getSpaceRootDocHandle();
      rootDocHandle.change((doc: DatabaseDirectory) => {
        doc.links![obj1.id] = 'automerge:4hjTgo9zLNsfRTJiLcpPY8P4smy';
      });
      await db.flush();
      expectedObjectId = obj2.id;
      await peer.close();
    }

    {
      const peer = await builder.createPeer({ storagePath: tmpPath });
      const db = await peer.openLastDatabase();
      const queryResult = await db.query(Query.select(Filter.everything())).run();
      expect(queryResult.length).to.eq(1);
      expect(queryResult[0].id).to.eq(expectedObjectId);
    }
  });

  test('objects url changes, the latest document is loaded', async () => {
    const builder = new EchoTestBuilder();
    onTestFinished(async () => {
      await builder.close();
    });

    const peer = await builder.createPeer();

    let assertion: { objectId: string; documentUrl: string };
    {
      const db = await peer.createDatabase();
      const [obj1, obj2] = await createObjects(peer, db, { count: 2 });

      expect((await db.query(Query.select(Filter.everything())).run()).length).to.eq(2);
      const rootDocHandle = db.getSpaceRootDocHandle();
      const obj1DocHandle = getObjectCore(obj1).docHandle!;
      const anotherDocHandle = getObjectCore(obj2).docHandle!;
      // Wait for documents to be ready before accessing url and objects.
      await Promise.all([rootDocHandle.whenReady(), obj1DocHandle.whenReady(), anotherDocHandle.whenReady()]);
      anotherDocHandle.change((doc: DatabaseDirectory) => {
        doc.objects![obj1.id] = obj1DocHandle.doc()!.objects![obj1.id];
      });
      rootDocHandle.change((doc: DatabaseDirectory) => {
        doc.links![obj1.id] = new A.RawString(anotherDocHandle.url!);
      });
      await db.flush();
      await peer.host.queryService.reindex();

      assertion = { objectId: obj2.id, documentUrl: anotherDocHandle.url! };
    }

    await peer.reload();

    {
      const db = await peer.openLastDatabase();
      await db.updateIndexes();
      const queryResult = await db.query(Query.select(Filter.everything())).run();
      expect(queryResult.length).to.eq(2);

      const object = queryResult.find((obj) => obj.id === assertion.objectId)!;
      expect(getObjectCore(object).docHandle!.url).to.eq(assertion.documentUrl);
      expect(queryResult.find((obj) => obj.id !== assertion.objectId)).not.to.be.undefined;
    }
  });

  test('query immediately after delete and indexing works', async () => {
    const spaceKey = PublicKey.random();

    const builder = new EchoTestBuilder();
    onTestFinished(async () => {
      await builder.close();
    });

    const peer = await builder.createPeer();
    const db = await peer.createDatabase(spaceKey);
    const [obj1, obj2] = await createObjects(peer, db, { count: 2 });

    db.remove(obj2);
    await db.flush();

    const queryResult = await db.query(Query.select(Filter.everything())).run();
    expect(queryResult.length).to.eq(1);
    expect(queryResult[0].id).to.eq(obj1.id);
  });

  test('query fails if one of the results fails to load', async () => {
    const spaceKey = PublicKey.random();

    const builder = new EchoTestBuilder();
    onTestFinished(async () => {
      await builder.close();
    });

    const peer = await builder.createPeer();
    const db = await peer.createDatabase(spaceKey);
    const [obj1] = await createObjects(peer, db, { count: 2 });

    const obj2Core = getObjectCore(obj1);
    obj2Core.docHandle!.delete(); // Deleted handle access throws an exception.

    await expect(db.query(Query.select(Filter.everything())).run()).rejects.toBeInstanceOf(Error);
  });

  // TODO(burdon): Flakey.
  test.skip('map over refs in query result', async () => {
    const { db } = await builder.createDatabase();
    const folder = db.add(Obj.make(TestSchema.Expando, { name: 'folder', objects: [] as any[] }));
    const objects = range(3).map(() => createTestObject());
    for (const object of objects) {
      folder.objects.push(Ref.make(object as any));
    }

    const queryResult = await db.query(Filter.type(TestSchema.Expando, { name: 'folder' })).run();
    const result = queryResult.flatMap(({ objects }) => objects.map((o: Ref.Unknown) => o.target));

    for (const i in objects) {
      expect(result[i]).to.eq(objects[i]);
    }
  });

  describe('Filter', () => {
    test('query objects with different versions', async () => {
      const ContactV1 = Type.makeObject(DXN.make('com.example.type.person', '0.1.0'))(
        Schema.Struct({
          firstName: Schema.String,
          lastName: Schema.String,
        }),
      );

      const ContactV2 = Type.makeObject(DXN.make('com.example.type.person', '0.2.0'))(
        Schema.Struct({
          name: Schema.String,
        }),
      );

      const { peer, db } = await builder.createDatabase({
        types: [ContactV1, ContactV2],
      });

      const contactV1 = db.add(Obj.make(ContactV1, { firstName: 'John', lastName: 'Doe' }));
      const contactV2 = db.add(Obj.make(ContactV2, { name: 'Brian Smith' }));
      await db.flush();

      const assertQueries = async (db: EchoDatabase) => {
        await assertQuery(db, Filter.type(ContactV1), [contactV1]);
        await assertQuery(db, Filter.type(ContactV1), [contactV1]);
        await assertQuery(db, Filter.type(ContactV2), [contactV2]);
        await assertQuery(db, Filter.type(DXN.make('com.example.type.person')), [contactV1, contactV2]);
        await assertQuery(db, Filter.type(DXN.make('com.example.type.person', '0.1.0')), [contactV1]);
        await assertQuery(db, Filter.type(DXN.make('com.example.type.person', '0.2.0')), [contactV2]);
        await assertQuery(db, Filter.type(DXN.make('com.example.type.person', '0.2.0')), [contactV2]);
      };

      await assertQueries(db);

      await peer.reload();
      await assertQueries(await peer.openLastDatabase());
    });

    test('not(or) query', async () => {
      const { db, graph } = await builder.createDatabase();
      graph.registry.add([TestSchema.Person, TestSchema.Task]);

      db.add(Obj.make(TestSchema.Person, {}));
      db.add(Obj.make(TestSchema.Task, {}));
      const expando = db.add(Obj.make(TestSchema.Expando, { name: 'expando' }));

      const query = db.query(
        Query.select(Filter.not(Filter.or(Filter.type(TestSchema.Person), Filter.type(TestSchema.Task)))),
      );
      const result = await query.run();
      expect(result).to.have.length(1);
      expect(result[0]).to.eq(expando);
    });

    test('filter by refs', async () => {
      const { db } = await builder.createDatabase();

      const a = db.add(Obj.make(TestSchema.Expando, { name: 'a' }));
      const b = db.add(Obj.make(TestSchema.Expando, { name: 'b', owner: Ref.make(a) }));
      db.add(Obj.make(TestSchema.Expando, { name: 'c' }));

      const objects = await db.query(Query.select(Filter.type(TestSchema.Expando, { owner: Ref.make(a) }))).run();
      expect(objects).toEqual([b]);
    });

    test('query relation by type', async () => {
      const { db, graph } = await builder.createDatabase();
      graph.registry.add([TestSchema.Person, TestSchema.HasManager]);

      const person1 = db.add(Obj.make(TestSchema.Person, { name: 'Alice' }));
      const person2 = db.add(Obj.make(TestSchema.Person, { name: 'Bob' }));
      const hasManager = db.add(
        Relation.make(TestSchema.HasManager, {
          [Relation.Source]: person1,
          [Relation.Target]: person2,
        }),
      );

      const objects = await db.query(Filter.type(TestSchema.HasManager)).run();
      expect(objects).toEqual([hasManager]);
    });

    test('tags', async () => {
      const { db } = await builder.createDatabase();

      const important = 'echo:/TAGIMPORTANT';
      const investor = 'echo:/TAGINVESTOR';
      const importantRef = Ref.fromURI(URI.make(important));
      const investorRef = Ref.fromURI(URI.make(investor));

      db.add(Obj.make(TestSchema.Expando, { name: 'a' }));
      const b = db.add(
        Obj.make(TestSchema.Expando, {
          name: 'b',
          [Obj.Meta]: { tags: [importantRef] },
        }),
      );
      const c = db.add(
        Obj.make(TestSchema.Expando, {
          name: 'c',
          [Obj.Meta]: { tags: [importantRef, investorRef] },
        }),
      );

      const objects = await db.query(Query.select(Filter.tag(important))).run();
      expect(objects).toEqual([b, c]);
    });

    test('bare string tags are upgraded to refs on read', async ({ expect }) => {
      const { db } = await builder.createDatabase();
      const obj = db.add(Obj.make(TestSchema.Expando, { name: 'legacy' }));
      await db.flush();

      // Simulate data written before the tags-as-refs migration: a bare tag id string in `meta.tags`.
      const tagEid = EID.make({ entityId: EntityId.make('01J00000000000000000000000') });
      getObjectCore(obj).setDecoded(['meta', 'tags'], [tagEid]);

      // Read back: the string is materialized as a `Ref` carrying the tag EID.
      const tags = Obj.getMeta(obj).tags;
      expect(tags).toHaveLength(1);
      expect(Ref.isRef(tags[0])).toBe(true);
      expect(tags[0].uri).toBe(tagEid);

      // And it remains queryable by the tag URI.
      const objects = await db.query(Query.select(Filter.tag(tagEid))).run();
      expect(objects).toEqual([obj]);
    });

    test('absent tags/annotations are backfilled to defaults on read', async ({ expect }) => {
      const { db } = await builder.createDatabase();
      const obj = db.add(Obj.make(TestSchema.Expando, { name: 'legacy' }));
      await db.flush();

      // Simulate data written before `tags`/`annotations` existed: meta has only `keys`.
      getObjectCore(obj).setDecoded(['meta'], { keys: [] });

      const meta = Obj.getMeta(obj);
      expect([...meta.tags]).toEqual([]);
      expect(meta.annotations).toEqual({});
    });
  });

  describe('Traversal', () => {
    let peer: EchoTestPeer;
    let db: EchoDatabase;
    let person1: TestSchema.Person;
    let person2: TestSchema.Person;

    beforeEach(async () => {
      peer = await builder.createPeer({
        types: [TestSchema.Person, TestSchema.HasManager, TestSchema.Task],
      });
      db = await peer.createDatabase();

      person1 = db.add(Obj.make(TestSchema.Person, { name: 'Alice' }));
      person2 = db.add(Obj.make(TestSchema.Person, { name: 'Bob' }));
      db.add(
        Relation.make(TestSchema.HasManager, {
          [Relation.Source]: person2,
          [Relation.Target]: person1,
        }),
      );

      db.add(
        Obj.make(TestSchema.Task, {
          title: 'Task 1',
          assignee: Ref.make(person1),
        }),
      );
      db.add(
        Obj.make(TestSchema.Task, {
          title: 'Task 2',
          assignee: Ref.make(person1),
        }),
      );
      db.add(
        Obj.make(TestSchema.Task, {
          title: 'Task 3',
          assignee: Ref.make(person2),
        }),
      );

      await db.flush();
    });

    test('traverse relation source to target', async () => {
      const objects = await db
        .query(
          Query.select(Filter.type(TestSchema.Person, { name: 'Bob' }))
            .sourceOf(TestSchema.HasManager)
            .target(),
        )
        .run();

      expect(objects).toMatchObject([{ name: 'Alice' }]);
    });

    test('traverse relation target to source', async () => {
      const objects = await db
        .query(
          Query.select(Filter.type(TestSchema.Person, { name: 'Alice' }))
            .targetOf(TestSchema.HasManager)
            .source(),
        )
        .run();

      expect(objects).toMatchObject([{ name: 'Bob' }]);
    });

    test('traverse outbound references', async () => {
      const objects = await db
        .query(Query.select(Filter.type(TestSchema.Task, { title: 'Task 1' })).reference('assignee'))
        .run();

      expect(objects).toMatchObject([{ name: 'Alice' }]);
      log.info('done testing');
    });

    test('traverse outbound array references', async () => {
      db.add(
        Obj.make(TestSchema.Expando, {
          name: 'Contacts',
          objects: [Ref.make(person1)],
        }),
      );
      await db.flush();

      const objects = await db
        .query(Query.select(Filter.type(TestSchema.Expando, { name: 'Contacts' })).reference('objects'))
        .run();
      expect(objects).toMatchObject([{ name: 'Alice' }]);
    });

    test('traverse inbound references', async () => {
      const objects = await db
        .query(
          Query.select(Filter.type(TestSchema.Person, { name: 'Alice' })).referencedBy(TestSchema.Task, 'assignee'),
        )
        .run();

      // TODO(dmaretskyi): Sort in query result.
      expect(objects.sort((a, b) => a.title!.localeCompare(b.title!))).toMatchObject([
        { title: 'Task 1' },
        { title: 'Task 2' },
      ]);
    });

    test('sqlIndex: referencedBy property path matches full path (not just first segment)', async () => {
      const { db: sqlDb } = await builder.createDatabase({ types: [TestSchema.Person] });

      const person = sqlDb.add(Obj.make(TestSchema.Person, { name: 'Alice' }));

      sqlDb.add(
        Obj.make(TestSchema.Expando, {
          name: 'direct',
          a: Ref.make(person),
        }),
      );

      sqlDb.add(
        Obj.make(TestSchema.Expando, {
          name: 'nested',
          a: { b: Ref.make(person) },
        }),
      );

      await sqlDb.flush();

      // When no property is specified, referencedBy() should return all incoming references (including nested ones).
      const allIncoming = await sqlDb
        .query(Query.select(Filter.type(TestSchema.Person, { name: 'Alice' })).referencedBy(TestSchema.Expando))
        .run();
      expect(allIncoming.map((o) => o.name).sort()).toEqual(['direct', 'nested']);

      const nested = await sqlDb
        .query(Query.select(Filter.type(TestSchema.Person, { name: 'Alice' })).referencedBy(TestSchema.Expando, 'a.b'))
        .run();
      expect(nested.map((o) => o.name).sort()).toEqual(['nested']);

      const direct = await sqlDb
        .query(Query.select(Filter.type(TestSchema.Person, { name: 'Alice' })).referencedBy(TestSchema.Expando, 'a'))
        .run();
      expect(direct.map((o) => o.name).sort()).toEqual(['direct']);
    });

    test('sqlIndex: referencedBy matches both space-qualified and bare refs to the same entity', async () => {
      const { db: sqlDb } = await builder.createDatabase({ types: [TestSchema.Person] });

      const person = sqlDb.add(Obj.make(TestSchema.Person, { name: 'Alice' }));

      // Bare ref, as produced in code by `Ref.make`.
      sqlDb.add(Obj.make(TestSchema.Expando, { name: 'bare', a: Ref.make(person) }));
      // Space-qualified ref, as produced by the RefField object picker (it builds the ref from the entity's
      // fully-qualified URI). Reverse-ref lookups must still find it: a space-less anchor refers to the same
      // space implicitly, so qualified and bare refs to the same entity match.
      const qualified = Ref.fromURI(URI.make(EID.make({ spaceId: sqlDb.spaceId, entityId: person.id })));
      sqlDb.add(Obj.make(TestSchema.Expando, { name: 'qualified', a: qualified }));

      await sqlDb.flush();

      const referrers = await sqlDb
        .query(Query.select(Filter.type(TestSchema.Person, { name: 'Alice' })).referencedBy(TestSchema.Expando))
        .run();
      expect(referrers.map((o) => o.name).sort()).toEqual(['bare', 'qualified']);
    });

    test('traverse inbound array references', async () => {
      db.add(
        Obj.make(TestSchema.Expando, {
          name: 'Contacts',
          objects: [Ref.make(person1)],
        }),
      );
      await db.flush();

      const objects = await db
        .query(Query.select(Filter.type(TestSchema.Person)).referencedBy(TestSchema.Expando, 'objects'))
        .run();
      expect(objects).toMatchObject([{ name: 'Contacts' }]);
    });

    test('traverse inbound references with only type filter (any property)', async () => {
      const objects = await db
        .query(Query.select(Filter.type(TestSchema.Person, { name: 'Alice' })).referencedBy(TestSchema.Task))
        .run();

      // Should return Task 1 and Task 2 which reference Alice via assignee property.
      expect(objects.sort((a, b) => a.title!.localeCompare(b.title!))).toMatchObject([
        { title: 'Task 1' },
        { title: 'Task 2' },
      ]);
    });

    test('traverse inbound references with no filter (any type, any property)', async () => {
      // Add an expando that references person1.
      db.add(
        Obj.make(TestSchema.Expando, {
          name: 'Note about Alice',
          subject: Ref.make(person1),
        }),
      );
      await db.flush();

      const objects = await db
        .query(Query.select(Filter.type(TestSchema.Person, { name: 'Alice' })).referencedBy())
        .run();

      // Should return all objects that reference Alice via regular references: Task 1, Task 2, and the Note.
      // Note: Relations (like HasManager) are not included because they use a different storage mechanism.
      expect(objects).toHaveLength(3);
      const titles = objects
        .filter((o) => o.title)
        .map((o) => o.title)
        .sort();
      expect(titles).toEqual(['Task 1', 'Task 2']);
      const names = objects
        .filter((o) => o.name)
        .map((o) => o.name)
        .sort();
      expect(names).toEqual(['Note about Alice']);
    });

    test('traverse query started from id', async () => {
      const objects = await db
        .query(Query.select(Filter.id(person2.id)).sourceOf(TestSchema.HasManager).target())
        .run();

      expect(objects).toMatchObject([{ name: 'Alice' }]);
    });

    test('query union', async () => {
      const query1 = Query.select(Filter.type(TestSchema.Person, { name: 'Alice' })).referencedBy(
        TestSchema.Task,
        'assignee',
      );
      const query2 = Query.select(Filter.type(TestSchema.Person, { name: 'Bob' })).referencedBy(
        TestSchema.Task,
        'assignee',
      );
      const query = Query.all(query1, query2);
      const objects = await db.query(query).run();
      expect(objects).toHaveLength(3);
    });

    test('union of limited queries', async () => {
      // Query for tasks assigned to Alice, limited to 1.
      const query1 = Query.select(Filter.type(TestSchema.Person, { name: 'Alice' }))
        .referencedBy(TestSchema.Task, 'assignee')
        .limit(1);
      // Query for tasks assigned to Bob, limited to 1.
      const query2 = Query.select(Filter.type(TestSchema.Person, { name: 'Bob' }))
        .referencedBy(TestSchema.Task, 'assignee')
        .limit(1);

      const query = Query.all(query1, query2);
      const objects = await db.query(query).run();

      // Should get 1 task from Alice (out of 2) + 1 task from Bob (out of 1) = 2 total.
      expect(objects).toHaveLength(2);
    });

    test('query set difference', async () => {
      const query1 = Query.select(Filter.type(TestSchema.Person));
      const query2 = Query.select(Filter.type(TestSchema.Person)).sourceOf(TestSchema.HasManager).source();
      const query = Query.without(query1, query2);
      const objects = await db.query(query).run();
      expect(objects).toEqual([person1]);
    });

    test('traverse to parent', async () => {
      // Create parent-child hierarchy.
      const parent = db.add(Obj.make(TestSchema.Expando, { name: 'Parent' }));
      const child = db.add(
        Obj.make(TestSchema.Expando, {
          [Obj.Parent]: parent,
          name: 'Child',
        }),
      );
      await db.flush();

      // Query for parent from child.
      const objects = await db.query(Query.select(Filter.id(child.id)).parent()).run();
      expect(objects).toHaveLength(1);
      expect(objects[0]).toMatchObject({ name: 'Parent' });
    });

    test('traverse to children', async () => {
      // Create parent-child hierarchy.
      const parent = db.add(Obj.make(TestSchema.Expando, { name: 'Parent' }));
      const child1 = db.add(
        Obj.make(TestSchema.Expando, {
          [Obj.Parent]: parent,
          name: 'Child 1',
        }),
      );
      const child2 = db.add(
        Obj.make(TestSchema.Expando, {
          [Obj.Parent]: parent,
          name: 'Child 2',
        }),
      );
      await db.flush();
      // writeFileSync('index-core.db', await peer.exportSqliteDatabase());
      // console.log('exported ./index-core.db');

      // Query for children from parent.
      const objects = await db.query(Query.select(Filter.id(parent.id)).children()).run();
      expect(objects).toHaveLength(2);
      const names = objects.map((o) => o.name).sort();
      expect(names).toEqual(['Child 1', 'Child 2']);
    });

    test('traverse parent-child hierarchy with multiple levels', async () => {
      // Create grandparent -> parent -> child hierarchy.
      const grandparent = db.add(Obj.make(TestSchema.Expando, { name: 'Grandparent' }));
      const parent = db.add(
        Obj.make(TestSchema.Expando, {
          [Obj.Parent]: grandparent,
          name: 'Parent',
        }),
      );
      const child = db.add(
        Obj.make(TestSchema.Expando, {
          [Obj.Parent]: parent,
          name: 'Child',
        }),
      );
      await db.flush();

      // Query for grandparent from child (going through parent).
      const parents = await db.query(Query.select(Filter.id(child.id)).parent()).run();
      expect(parents).toHaveLength(1);
      expect(parents[0]).toMatchObject({ name: 'Parent' });

      // Query for grandparent from parent.
      const grandparents = await db.query(Query.select(Filter.id(parent.id)).parent()).run();
      expect(grandparents).toHaveLength(1);
      expect(grandparents[0]).toMatchObject({ name: 'Grandparent' });

      // Query children of grandparent.
      const grandparentChildren = await db.query(Query.select(Filter.id(grandparent.id)).children()).run();
      expect(grandparentChildren).toHaveLength(1);
      expect(grandparentChildren[0]).toMatchObject({ name: 'Parent' });

      // Query children of parent.
      const parentChildren = await db.query(Query.select(Filter.id(parent.id)).children()).run();
      expect(parentChildren).toHaveLength(1);
      expect(parentChildren[0]).toMatchObject({ name: 'Child' });
    });

    test('traverse to children of a feed returns feed queue items', async () => {
      const feedPeer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Task] });
      const feedDb = await feedPeer.createDatabase();

      const feed = feedDb.add(Feed.make({ name: 'test-feed' }));

      // Space-only task (should NOT appear as a child of the feed).
      feedDb.add(Obj.make(TestSchema.Task, { title: 'Space Task' }));
      await feedDb.appendToFeed(feed, [
        Obj.make(TestSchema.Task, { title: 'Feed Task 1' }),
        Obj.make(TestSchema.Task, { title: 'Feed Task 2' }),
      ]);
      await feedDb.flush();

      const objects = await feedDb.query(Query.select(Filter.id(feed.id)).children()).run();
      expect(objects).toHaveLength(2);
      const titles = objects.map((obj: any) => obj.title).sort();
      expect(titles).toEqual(['Feed Task 1', 'Feed Task 2']);
    });
  });

  describe.skip('text search (old indexer)', () => {
    test('vector', async () => {
      const { db } = await builder.createDatabase({
        types: [TestSchema.Task],
      });

      db.add(Obj.make(TestSchema.Task, { title: 'fix the tests' }));
      db.add(Obj.make(TestSchema.Task, { title: 'perf optimizations' }));
      await db.flush();

      {
        const objects = await db.query(Query.select(Filter.text('fix the tests', { type: 'vector' }))).run();
        expect(objects[0].title).toEqual('fix the tests');
      }

      {
        const objects = await db.query(Query.select(Filter.text('perf optimizations', { type: 'vector' }))).run();
        expect(objects[0].title).toEqual('perf optimizations');
      }

      {
        const objects = await db.query(Query.select(Filter.text('vegetable', { type: 'vector' }))).run();
        expect(objects).toHaveLength(1);
        expect(objects[0].title).toEqual('fix the tests');
      }
    });

    test('full-text', async () => {
      const { db, graph } = await builder.createDatabase();
      graph.registry.add([TestSchema.Task]);

      db.add(Obj.make(TestSchema.Task, { title: 'fix the tests' }));
      db.add(Obj.make(TestSchema.Task, { title: 'perf optimizations' }));

      await db.flush();

      {
        const objects = await db.query(Query.select(Filter.text('fix the tests', { type: 'full-text' }))).run();
        expect(objects).toHaveLength(1);
        expect(objects[0].title).toEqual('fix the tests');
      }

      {
        const objects = await db.query(Query.select(Filter.text('perf optimizations', { type: 'full-text' }))).run();
        expect(objects).toHaveLength(1);
        expect(objects[0].title).toEqual('perf optimizations');
      }

      {
        const objects = await db.query(Query.select(Filter.text('vegetable', { type: 'full-text' }))).run();
        expect(objects).toHaveLength(0);
      }

      {
        const objects = await db.query(Query.select(Filter.text('animal', { type: 'full-text' }))).run();
        expect(objects).toHaveLength(0);
      }
    });
  });

  describe('indexer2 text search', () => {
    test('full-text search via indexer2', async () => {
      const { db } = await builder.createDatabase();

      db.add(Obj.make(TestSchema.Expando, { title: 'Introduction to TypeScript' }));
      db.add(Obj.make(TestSchema.Expando, { title: 'Getting Started with React' }));
      db.add(Obj.make(TestSchema.Expando, { title: 'Advanced Python Programming' }));
      await db.flush();

      // TODO(mykola): Defalut to full-text
      const objects = await db.query(Query.select(Filter.text('TypeScript', { type: 'full-text' }))).run();
      expect(objects).toHaveLength(1);
      expect(objects[0].title).toEqual('Introduction to TypeScript');

      // Verify specific search results.
      {
        const objects = await db.query(Query.select(Filter.text('TypeScript', { type: 'full-text' }))).run();
        expect(objects).toHaveLength(1);
        expect(objects[0].title).toEqual('Introduction to TypeScript');
      }

      {
        const objects = await db.query(Query.select(Filter.text('React', { type: 'full-text' }))).run();
        expect(objects).toHaveLength(1);
        expect(objects[0].title).toEqual('Getting Started with React');
      }

      {
        const objects = await db.query(Query.select(Filter.text('Python', { type: 'full-text' }))).run();
        expect(objects).toHaveLength(1);
        expect(objects[0].title).toEqual('Advanced Python Programming');
      }

      // Non-matching query.
      {
        const objects = await db.query(Query.select(Filter.text('JavaScript', { type: 'full-text' }))).run();
        expect(objects).toHaveLength(0);
      }
    });

    test('full-text search across multiple matching objects', async () => {
      const { db } = await builder.createDatabase();

      db.add(Obj.make(TestSchema.Expando, { title: 'Programming with JavaScript' }));
      db.add(Obj.make(TestSchema.Expando, { title: 'JavaScript Best Practices' }));
      db.add(Obj.make(TestSchema.Expando, { title: 'Python for Data Science' }));
      await db.flush();

      const objects = await db.query(Query.select(Filter.text('JavaScript', { type: 'full-text' }))).run();
      expect(objects).toHaveLength(2);
      expect(objects.map((o) => o.title).sort()).toEqual(
        ['JavaScript Best Practices', 'Programming with JavaScript'].sort(),
      );
    });

    test('full-text search with partial word matching (trigram)', async () => {
      const { db } = await builder.createDatabase();

      db.add(Obj.make(TestSchema.Expando, { title: 'Introduction to TypeScript' }));
      db.add(Obj.make(TestSchema.Expando, { title: 'Getting Started with React' }));
      db.add(Obj.make(TestSchema.Expando, { title: 'Advanced Python Programming' }));
      await db.flush();

      // Partial word "Script" should match "TypeScript".
      {
        const objects = await db.query(Query.select(Filter.text('Script', { type: 'full-text' }))).run();
        expect(objects).toHaveLength(1);
        expect(objects[0].title).toEqual('Introduction to TypeScript');
      }

      // Partial word "Prog" should match "Programming".
      {
        const objects = await db.query(Query.select(Filter.text('Prog', { type: 'full-text' }))).run();
        expect(objects).toHaveLength(1);
        expect(objects[0].title).toEqual('Advanced Python Programming');
      }

      // Substring in the middle "Pytho" should match "Python".
      {
        const objects = await db.query(Query.select(Filter.text('ytho', { type: 'full-text' }))).run();
        expect(objects).toHaveLength(1);
        expect(objects[0].title).toEqual('Advanced Python Programming');
      }

      // Single character query uses LIKE fallback and matches all documents
      {
        const objects = await db.query(Query.select(Filter.text('I', { type: 'full-text' }))).run();
        expect(objects).toHaveLength(3);
      }
    });

    test('full-text search with wrong word order', async () => {
      const { db } = await builder.createDatabase();

      db.add(Obj.make(TestSchema.Expando, { title: 'Python Programming Guide' }));
      db.add(Obj.make(TestSchema.Expando, { title: 'JavaScript Basics' }));
      await db.flush();

      // Words in different order should still match.
      {
        const objects = await db.query(Query.select(Filter.text('Programming Python', { type: 'full-text' }))).run();
        expect(objects).toHaveLength(1);
        expect(objects[0].title).toEqual('Python Programming Guide');
      }

      // Another wrong order example.
      {
        const objects = await db.query(Query.select(Filter.text('Guide Python', { type: 'full-text' }))).run();
        expect(objects).toHaveLength(1);
        expect(objects[0].title).toEqual('Python Programming Guide');
      }
    });

    test('full-text search after content update', async () => {
      const { db } = await builder.createDatabase();

      const obj = db.add(Obj.make(TestSchema.Expando, { title: 'Original Title' }));
      await db.flush();

      // Poll until indexer2 has processed the document.
      {
        const objects = await db.query(Query.select(Filter.text('Original', { type: 'full-text' }))).run();
        expect(objects).toHaveLength(1);
      }

      // Update the object.
      Obj.update(obj, (obj) => {
        obj.title = 'Updated Title';
      });
      await db.flush();

      // Verify search results.
      {
        const objects = await db.query(Query.select(Filter.text('Updated', { type: 'full-text' }))).run();
        expect(objects).toHaveLength(1);
        expect(objects[0].title).toEqual('Updated Title');
      }

      // Original content should no longer match.
      {
        const objects = await db.query(Query.select(Filter.text('Original', { type: 'full-text' }))).run();
        expect(objects).toHaveLength(0);
      }
    });

    test.skip('stress', { timeout: 1200_000 }, async () => {
      console.log('begin test');
      const { db } = await builder.createDatabase();

      const ANIMALS = [
        'dog',
        'cat',
        'bird',
        'fish',
        'horse',
        'rabbit',
        'snake',
        'tiger',
        'lion',
        'elephant',
        'zebra',
        'giraffe',
        'monkey',
        'penguin',
        'koala',
        'kangaroo',
        'panda',
      ];

      console.log('begin create');

      console.time('create');
      const counts = Object.fromEntries(ANIMALS.map((animal) => [animal, 0]));
      for (const _ of range(10_000)) {
        const animal = random.helpers.arrayElement(ANIMALS);
        counts[animal]++;
        db.add(
          Obj.make(TestSchema.Expando, {
            title: random.lorem.sentence(10) + ' ' + animal + ' ' + random.lorem.sentence(10),
          }),
        );
        if (_ % 1000 === 0) {
          await sleep(1);
          console.log('creating', _);
        }
      }
      console.timeEnd('create');

      console.time('flush');
      await db.flush();
      console.timeEnd('flush');

      console.time('query');
      const needle = random.helpers.arrayElement(ANIMALS);
      const objects = await db.query(Query.select(Filter.text(needle, { type: 'full-text' }))).run();
      console.timeEnd('query');
      console.log('objects', {
        needle,
        count: objects.length,
        expected: counts[needle],
      });
      for (const object of objects) {
        expect(object.title).toContain(needle);
      }
    });

    test('full-text search in queues via indexer2', async () => {
      const peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Task] });
      const db = await peer.createDatabase();
      const feed = db.add(Feed.make({}));

      // Add objects to the queue.
      await db.appendToFeed(feed, [
        Obj.make(TestSchema.Task, { title: 'Introduction to TypeScript' }),
        Obj.make(TestSchema.Task, { title: 'Getting Started with React' }),
        Obj.make(TestSchema.Task, { title: 'Advanced Python Programming' }),
      ]);

      // Wait for indexing.
      await db.flush();

      // Search in specific queue.
      {
        const objects = await db
          .query(
            Query.select(Filter.text('TypeScript', { type: 'full-text' })).from([Scope.feed(Feed.getFeedUri(feed)!)]),
          )
          .run();
        expect(objects).toHaveLength(1);
        expect((objects[0] as TestSchema.Task).title).toEqual('Introduction to TypeScript');
      }

      // Search for React.
      {
        const objects = await db
          .query(Query.select(Filter.text('React', { type: 'full-text' })).from([Scope.feed(Feed.getFeedUri(feed)!)]))
          .run();
        expect(objects).toHaveLength(1);
        expect((objects[0] as TestSchema.Task).title).toEqual('Getting Started with React');
      }

      // Non-matching query.
      {
        const objects = await db
          .query(
            Query.select(Filter.text('JavaScript', { type: 'full-text' })).from([Scope.feed(Feed.getFeedUri(feed)!)]),
          )
          .run();
        expect(objects).toHaveLength(0);
      }
    });

    test('full-text search with allFeedsFromSpaces via indexer2', async () => {
      const peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Task] });
      const db = await peer.createDatabase();
      const feed = db.add(Feed.make({}));

      // Add objects to the database (space objects).
      db.add(Obj.make(TestSchema.Task, { title: 'Space Object TypeScript' }));

      // Add objects to the queue.
      await db.appendToFeed(feed, [Obj.make(TestSchema.Task, { title: 'Queue Object TypeScript' })]);

      // Wait for indexing.
      await db.flush();

      // Search with allFeedsFromSpaces: true should return both space and queue objects.
      {
        const objects: TestSchema.Task[] = await db
          .query(Query.select(Filter.text('TypeScript', { type: 'full-text' })).from(db, { includeFeeds: true }))
          .run();
        expect(objects).toHaveLength(2);
        expect(objects.map((_) => _.title).sort()).toEqual(['Queue Object TypeScript', 'Space Object TypeScript']);
      }

      // Search without allFeedsFromSpaces should return only space objects.
      {
        const objects = await db.query(Query.select(Filter.text('TypeScript', { type: 'full-text' }))).run();
        expect(objects).toHaveLength(1);
        expect((objects[0] as TestSchema.Task).title).toEqual('Space Object TypeScript');
      }

      // console.log('dumpSqliteDatabase', await peer.dumpSqliteDatabase());
    });

    test('full-text search from queue returns valid echo objects', async () => {
      const peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Task] });
      const db = await peer.createDatabase();
      const feed = db.add(Feed.make({}));
      const task = Obj.make(TestSchema.Task, { title: 'Queue Object TypeScript' });
      await db.appendToFeed(feed, [task]);
      await db.flush();

      const obj: TestSchema.Task = await db
        .query(
          Query.select(Filter.text('TypeScript', { type: 'full-text' })).from([Scope.feed(Feed.getFeedUri(feed)!)]),
        )
        .first();
      expect(obj).toBeDefined();
      expect(Obj.getURI(obj)).toMatch(/^echo:\/\//);
      expect(Obj.getURI(obj)).toContain(obj.id);
      expect(Obj.getTypename(obj)).toBe(Type.getTypename(TestSchema.Task));
      expect(Obj.getType(obj)).toEqual(TestSchema.Task);
      expect(obj.id).toEqual(task.id);
      expect(Obj.isDeleted(obj)).toBe(false);
      expect(Obj.getMeta(obj).keys).toEqual([]);
      expect(obj.title).toEqual('Queue Object TypeScript');
    });

    test('full-text search returns rank in entries', async () => {
      const { db } = await builder.createDatabase();

      db.add(Obj.make(TestSchema.Expando, { title: 'TypeScript TypeScript TypeScript' })); // High relevance.
      db.add(Obj.make(TestSchema.Expando, { title: 'TypeScript Programming' })); // Medium relevance.
      db.add(Obj.make(TestSchema.Expando, { title: 'Python Programming' })); // No match.
      await db.flush();

      const query = db.query(Query.select(Filter.text('TypeScript', { type: 'full-text' })));
      const entries = await query.runEntries();

      expect(entries).toHaveLength(2);
      // All FTS results should have a rank in their match metadata.
      for (const entry of entries) {
        expect(entry.match).toBeDefined();
        expect(entry.match!.rank).toBeDefined();
        expect(typeof entry.match!.rank).toBe('number');
        expect(entry.match!.rank).toBeGreaterThan(0);
      }
    });

    test('full-text search order by rank descending (default)', async () => {
      const { db } = await builder.createDatabase();

      // Create objects with varying relevance to the search term "TypeScript".
      db.add(Obj.make(TestSchema.Expando, { title: 'TypeScript' })); // Single occurrence.
      db.add(Obj.make(TestSchema.Expando, { title: 'TypeScript TypeScript TypeScript TypeScript' })); // High relevance.
      db.add(Obj.make(TestSchema.Expando, { title: 'TypeScript Programming Guide' })); // Medium relevance.
      await db.flush();

      // Order by rank descending (best matches first) - default direction.
      const query = db.query(Query.select(Filter.text('TypeScript', { type: 'full-text' })).orderBy(Order.rank()));
      const entries = await query.runEntries();

      expect(entries).toHaveLength(3);

      // Verify ranks are in descending order (higher rank = better match = first).
      for (let i = 0; i < entries.length - 1; i++) {
        expect(entries[i].match!.rank).toBeGreaterThanOrEqual(entries[i + 1].match!.rank);
      }

      // The item with highest relevance (most occurrences) should be first.
      expect(entries[0].result!.title).toBe('TypeScript TypeScript TypeScript TypeScript');
    });

    test('full-text search order by rank ascending', async () => {
      const { db } = await builder.createDatabase();

      // Create objects with varying relevance to the search term "TypeScript".
      db.add(Obj.make(TestSchema.Expando, { title: 'TypeScript' })); // Single occurrence.
      db.add(Obj.make(TestSchema.Expando, { title: 'TypeScript TypeScript TypeScript TypeScript' })); // High relevance.
      db.add(Obj.make(TestSchema.Expando, { title: 'TypeScript Programming Guide' })); // Medium relevance.
      await db.flush();

      // Order by rank ascending (worst matches first).
      const query = db.query(Query.select(Filter.text('TypeScript', { type: 'full-text' })).orderBy(Order.rank('asc')));
      const entries = await query.runEntries();

      expect(entries).toHaveLength(3);

      // Verify ranks are in ascending order (lower rank = worse match = first).
      for (let i = 0; i < entries.length - 1; i++) {
        expect(entries[i].match!.rank).toBeLessThanOrEqual(entries[i + 1].match!.rank);
      }

      // The item with lowest relevance should be first.
      expect(entries[entries.length - 1].result!.title).toBe('TypeScript TypeScript TypeScript TypeScript');
    });

    test('non-FTS queries return default rank of 1', async () => {
      const { db } = await builder.createDatabase();

      db.add(Obj.make(TestSchema.Expando, { title: 'Non-FTS Test Object 1' }));
      db.add(Obj.make(TestSchema.Expando, { title: 'Non-FTS Test Object 2' }));
      await db.flush();

      // Non-FTS query (all expandos, no text search).
      const query = db.query(Query.select(Filter.type(TestSchema.Expando)));
      const entries = await query.runEntries();

      // Should have at least 2 entries (the ones we created).
      expect(entries.length).toBeGreaterThanOrEqual(2);
      // All non-FTS results should have a default rank of 1.
      for (const entry of entries) {
        expect(entry.match).toBeDefined();
        expect(entry.match!.rank).toBe(1);
      }
    });

    test('order by rank with limit', async () => {
      const { db } = await builder.createDatabase();

      // Create multiple objects with varying relevance.
      db.add(Obj.make(TestSchema.Expando, { title: 'TypeScript' }));
      db.add(Obj.make(TestSchema.Expando, { title: 'TypeScript TypeScript' }));
      db.add(Obj.make(TestSchema.Expando, { title: 'TypeScript TypeScript TypeScript' }));
      db.add(Obj.make(TestSchema.Expando, { title: 'TypeScript TypeScript TypeScript TypeScript' }));
      await db.flush();

      // Order by rank descending and limit to top 2 results.
      const query = db.query(
        Query.select(Filter.text('TypeScript', { type: 'full-text' }))
          .orderBy(Order.rank())
          .limit(2),
      );
      const entries = await query.runEntries();

      expect(entries).toHaveLength(2);
      // Should get the top 2 most relevant results.
      expect(entries[0].result!.title).toBe('TypeScript TypeScript TypeScript TypeScript');
      expect(entries[1].result!.title).toBe('TypeScript TypeScript TypeScript');
    });
  });

  describe('Reactivity', () => {
    let db: EchoDatabase;
    let objects: Obj.Unknown[];

    beforeEach(async () => {
      ({ db } = await builder.createDatabase());

      objects = range(3).map(() => createTestObject({ value: 100 }));
      for (const object of objects) {
        db.add(object);
      }

      await db.flush();
    });

    test('fires only once when new objects are added', async () => {
      const query = db.query(Query.select(Filter.type(TestSchema.Expando, { value: 100 })));
      expect(query.runSync()).to.have.length(3);

      let count = 0;
      let lastResult;
      query.subscribe(() => {
        count++;
        lastResult = query.results;
      });
      expect(count).to.equal(0);

      db.add(createTestObject({ value: 100 }));
      await db.flush({ updates: true });
      expect(count).to.equal(1);
      expect(lastResult).to.have.length(4);
    });

    test('fires only once when objects are removed', async () => {
      const query = db.query(Query.select(Filter.type(TestSchema.Expando, { value: 100 })));
      expect(query.runSync()).to.have.length(3);

      let count = 0;
      query.subscribe(() => {
        console.log('query.results', query.results);
        count++;
        expect(query.results).to.have.length(2);
      });
      db.remove(objects[0]);
      await db.flush({ updates: true });
      expect(count).to.equal(1);
    });

    test('does not fire on object updates', async () => {
      const query = db.query(Query.select(Filter.type(TestSchema.Expando, { value: 100 })));
      expect(query.runSync()).to.have.length(3);

      let updateCount = 0;
      query.subscribe(() => {
        updateCount++;
      });
      Obj.update(objects[0], (o: any) => {
        o.title = 'Task 0a';
      });
      await sleep(10);
      expect(updateCount).to.equal(0);
    });

    test('can unsubscribe and resubscribe', async () => {
      const query = db.query(Query.select(Filter.type(TestSchema.Expando, { value: 100 })));

      let count = 0;
      let lastCount = 0;
      let lastResult;
      const unsubscribe = query.subscribe(() => {
        count++;
        lastResult = query.results;
      });
      expect(count, 'Does not fire updates immediately.').to.equal(0);

      {
        db.add(createTestObject({ value: 100 }));
        await db.flush({ updates: true });
        expect(count).to.be.greaterThan(lastCount);
        lastCount = count;
        expect(lastResult).to.have.length(4);
      }

      unsubscribe();

      {
        db.add(createTestObject({ value: 100 }));
        await db.flush({ updates: true });
        expect(count).to.be.equal(lastCount);
        lastCount = count;
      }

      query.subscribe(() => {
        count++;
        lastResult = query.results;
      });

      {
        db.add(createTestObject({ value: 100 }));
        await db.flush({ updates: true });
        expect(count).to.be.greaterThan(lastCount);
        lastCount = count;
        expect(lastResult).to.have.length(6);
      }
    });

    test('multiple queries do not influence each other', async () => {
      const query1 = db.query(Query.select(Filter.type(TestSchema.Expando, { value: 100 })));
      const query2 = db.query(Query.select(Filter.type(TestSchema.Expando, { value: 100 })));

      let count1 = 0;
      let count2 = 0;
      query1.subscribe(() => {
        count1++;
      });
      query2.subscribe(() => {
        count2++;
      });

      db.add(createTestObject({ value: 100 }));
      await db.flush({ updates: true });

      expect(count1).toEqual(1);
      expect(count2).toEqual(1);
    });

    // TODO(dmaretskyi): Fix this test.
    test.skip('deleting an element', async (ctx) => {
      const { db } = await builder.createDatabase({
        types: [TestSchema.Person],
      });

      // Create 3 test objects: Alice, Bob, Charlie.
      const person1 = db.add(Obj.make(TestSchema.Person, { name: 'Alice' }));
      const person2 = db.add(Obj.make(TestSchema.Person, { name: 'Bob' }));
      const person3 = db.add(Obj.make(TestSchema.Person, { name: 'Charlie' }));
      expect([person1, person2, person3].filter(Boolean)).to.have.length(3);
      await db.flush();

      // Track all updates to observe the bug.
      log.break();
      const updates: string[][] = [];
      const unsub = db.query(Query.select(Filter.type(TestSchema.Person))).subscribe(
        (query) => {
          const names = query.results.map((obj) => obj.name!);
          log.info('upd', { names });
          updates.push(names);
        },
        { fire: true },
      );
      ctx.onTestFinished(unsub);

      // Wait for initial renders to complete.
      await db.flush({ updates: true });
      log.break();

      // THE BUG REPRODUCTION: Delete Bob.
      db.remove(person2);
      log.info('removed bob');
      log.break();

      // Wait for all reactive updates to complete.
      await db.flush({ updates: true });
      log.break();

      // TODO(ZaymonFC): Remove this comment once the flash bug is resolved.
      /*
       * NOTE(ZaymonFC):
       *   Expected: 3 renders
       *   1. [] (empty)
       *   2. ['Alice', 'Bob', 'Charlie'] (all loaded)
       *   3. ['Alice', 'Charlie'] (Bob removed, no flash)
       *
       *   Actual: 4 renders
       *   1. [] (empty)
       *   2. ['Alice', 'Bob', 'Charlie'] (all loaded)
       *   3. ['Alice', 'Charlie', 'Bob'] (FLASH BUG - Bob moves to end!)
       *   4. ['Alice', 'Charlie'] (Bob finally removed)
       */

      expect(updates).toEqual([
        ['Alice', 'Bob', 'Charlie'], // All objects loaded.
        ['Alice', 'Charlie'], // Bob removed (no flash).
      ]);
    });

    test('bulk deleting multiple items should remove them from query results', async (ctx) => {
      // Setup: Create client and space.
      const { db } = await builder.createDatabase();

      // Create 10 test objects: 1, 2, 3, ..., 10.
      const objects = Array.from({ length: 10 }, (_, i) => db.add(Obj.make(TestSchema.Expando, { value: i + 1 })));
      await db.flush({ updates: true });

      // Track all updates to observe the bug.
      const updates: number[][] = [];
      const unsub = db.query(Query.select(Filter.type(TestSchema.Expando))).subscribe(
        (query) => {
          const values = [...query.results.map((obj) => obj.value)].sort((a, b) => a - b);
          updates.push(values);
        },
        { fire: true },
      );
      ctx.onTestFinished(unsub);

      // Wait for initial renders to complete.
      await db.flush({ updates: true });

      // THE BUG REPRODUCTION: Delete all items in a loop.
      for (const item of objects) {
        db.remove(item);
      }

      // Wait for all reactive updates to complete.
      // TODO(dmaretskyi): Does this ensure queries were re-run?
      await db.flush({ updates: true });

      // NOTE: There might be multiple updates dependending on how database components execute updates.
      // All objects loaded.
      expect(updates.at(0)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      // All objects deleted.
      expect(updates.at(-1)).toEqual([]);
    });

    // Regression for DX-966. The Composer navtree lists objects per type via a version-less
    // typename DXN (`Filter.type(DXN.make(typename))`), while stored objects carry a versioned
    // `@type`. The reactive index query must still be invalidated on delete so the navtree drops
    // the node. Mirrors the bulk-delete test above but with a version-less typename filter
    // instead of `Filter.type(StaticSchema)`.
    test('deleting an item removes it from a version-less typename query (reactive)', async ({
      expect,
      onTestFinished,
    }) => {
      const { db } = await builder.createDatabase({ types: [TestSchema.Person] });

      const alice = db.add(Obj.make(TestSchema.Person, { name: 'Alice' }));
      const bob = db.add(Obj.make(TestSchema.Person, { name: 'Bob' }));
      const charlie = db.add(Obj.make(TestSchema.Person, { name: 'Charlie' }));
      expect([alice, bob, charlie].filter(Boolean)).to.have.length(3);
      await db.flush({ indexes: true, updates: true });

      const updates: string[][] = [];
      const unsub = db.query(Query.select(Filter.type(DXN.make('com.example.type.person')))).subscribe(
        (query) => {
          updates.push([...query.results.map((obj) => obj.name!)].sort());
        },
        { fire: true },
      );
      onTestFinished(unsub);
      await db.flush({ indexes: true, updates: true });

      db.remove(bob);
      await db.flush({ indexes: true, updates: true });

      // Initial subscription sees all three; after the delete the reactive query drops Bob.
      expect(updates.at(0)).toEqual(['Alice', 'Bob', 'Charlie']);
      expect(updates.at(-1)).toEqual(['Alice', 'Charlie']);
    });
  });

  describe('Dynamic types', () => {
    let db: EchoDatabase, graph: Hypergraph.Hypergraph;

    beforeEach(async () => {
      ({ db, graph } = await builder.createDatabase());
    });

    test('query by typename receives updates', async () => {
      graph.registry.add([TestSchema.Person]);
      const contact = db.add(Obj.make(TestSchema.Person, {}));
      const name = 'DXOS User';

      const query = db.query(Filter.type(TestSchema.Person));
      const result = await query.run();
      expect(result).to.have.length(1);
      expect(result[0]).to.eq(contact);

      const nameUpdate = new Trigger();
      const anotherContactAdded = new Trigger();
      const unsub = query.subscribe((query) => {
        const objects = query.results;
        if (objects.some((obj) => obj.name === name)) {
          nameUpdate.wake();
        }
        if (objects.length === 2) {
          anotherContactAdded.wake();
        }
      });
      onTestFinished(() => unsub());

      Obj.update(contact, (contact) => {
        contact.name = name;
      });
      db.add(Obj.make(TestSchema.Person, {}));

      await asyncTimeout(nameUpdate.wait(), 1000);
      await asyncTimeout(anotherContactAdded.wait(), 1000);
    });

    test('query mutable schema objects', async () => {
      const schema = await db.addType(TestSchema.Person);
      const contact = db.add(Obj.make(schema, {}));

      // NOTE: Must use `Filter.type` with the stored Type.Type entity since matching is done by the object id of the schema entity.
      const query = db.query(Query.type(schema));
      const result = await query.run();
      expect(result).to.have.length(1);
      expect(result[0]).to.eq(contact);
    });

    test('`instanceof` operator works', async () => {
      graph.registry.add([TestSchema.Person]);
      const name = 'DXOS User';
      const contact = Obj.make(TestSchema.Person, { name });
      db.add(contact);
      expect(Obj.instanceOf(TestSchema.Person, contact)).to.be.true;

      // query
      {
        const contact = (await db.query(Filter.type(TestSchema.Person)).run())[0];
        expect(contact.name).to.eq(name);
        expect(Obj.instanceOf(TestSchema.Person, contact)).to.be.true;
      }
    });
  });

  describe('RegistryQuerySource', () => {
    let db: EchoDatabase, graph: Hypergraph.Hypergraph;

    beforeEach(async () => {
      ({ db, graph } = await builder.createDatabase());
    });

    test('query scoped to the registry returns objects from graph.registry', async ({ expect }) => {
      // Add an object only to the in-memory registry — NOT to any database.
      const registryObj = Obj.make(TestSchema.Expando, { value: 42 });
      graph.registry.add([registryObj]);

      // Query scoped to registry only fans in registry objects.
      const results = await db.query(Query.select(Filter.type(TestSchema.Expando)).from(Scope.registry())).run();
      expect(results).toHaveLength(1);
      expect((results[0] as any).value).toBe(42);
    });

    test('query scoped to space + registry coalesces registry and db objects', async ({ expect }) => {
      // One object in the registry, one in the database.
      graph.registry.add([Obj.make(TestSchema.Expando, { value: 1 })]);

      db.add(Obj.make(TestSchema.Expando, { value: 2 }));
      await db.flush();

      // Scoped to both the owning space and registry returns both.
      const results = await db
        .query(Query.select(Filter.type(TestSchema.Expando)).from(Scope.space(), Scope.registry()))
        .run();
      expect(results).toHaveLength(2);
      const values = results.map((r) => (r as any).value).sort();
      expect(values).toEqual([1, 2]);
    });

    test('registry is opt-in: plain db.query() excludes registry objects', async ({ expect }) => {
      // Object in the registry (not persisted to DB).
      graph.registry.add([Obj.make(TestSchema.Expando, { value: 42 })]);

      // Object persisted to the DB.
      db.add(Obj.make(TestSchema.Expando, { value: 99 }));
      await db.flush();

      // Plain db.query() targets the owning space only — registry excluded.
      const dbResults = await db.query(Query.select(Filter.type(TestSchema.Expando))).run();
      expect(dbResults).toHaveLength(1);
      expect((dbResults[0] as any).value).toBe(99);

      // Opting into the registry scope fans in both.
      const bothResults = await db
        .query(Query.select(Filter.type(TestSchema.Expando)).from(Scope.space(), Scope.registry()))
        .run();
      const values = bothResults.map((r) => (r as any).value).sort((a: number, b: number) => a - b);
      expect(values).toEqual([42, 99]);
    });

    test('subscription with registry scope re-fires when graph.registry changes', async ({ expect }) => {
      const query = db.query(Query.select(Filter.type(TestSchema.Expando)).from(Scope.registry()));

      const trigger = new Trigger<void>();
      const unsub = query.subscribe(() => {
        trigger.wake();
      });
      onTestFinished(() => unsub());

      graph.registry.add([Obj.make(TestSchema.Expando, { value: 7 })]);

      await asyncTimeout(trigger.wait(), 500);
      expect(query.results).toHaveLength(1);
    });

    test('Filter.type(Type.Type) scoped to space + registry returns types from both', async ({ expect }) => {
      // Register one type statically in the in-process registry.
      graph.registry.add([TestSchema.Person]);

      // Persist a different type to the database.
      await db.addType(TestSchema.Task);
      await db.flush();

      // Scoping to space + registry fans in both persisted and code-shipped types.
      const results = await db.query(Query.select(Filter.type(Type.Type)).from(Scope.space(), Scope.registry())).run();

      const typenames = results.map((t) => Type.getTypename(t));
      expect(typenames).toContain(Type.getTypename(TestSchema.Person));
      expect(typenames).toContain(Type.getTypename(TestSchema.Task));
    });
  });

  describe('Filter.childOf', () => {
    test('two echo objects - positive test', async () => {
      const { db } = await builder.createDatabase();
      const parent = db.add(Obj.make(TestSchema.Expando, { name: 'Parent' }));
      const child = db.add(
        Obj.make(TestSchema.Expando, {
          [Obj.Parent]: parent,
          name: 'Child',
        }),
      );
      await db.flush();

      const objects = await db.query(Query.select(Filter.childOf(parent))).run();
      expect(objects).toHaveLength(1);
      expect(objects[0]).toMatchObject({ name: 'Child' });
    });

    test('two echo objects - negative test', async () => {
      const { db } = await builder.createDatabase();
      const parent = db.add(Obj.make(TestSchema.Expando, { name: 'Parent' }));
      const unrelated = db.add(Obj.make(TestSchema.Expando, { name: 'Unrelated' }));
      await db.flush();

      const objects = await db.query(Query.select(Filter.childOf(parent))).run();
      expect(objects).toHaveLength(0);
    });

    test('chain of three echo objects - transitive positive', async () => {
      const { db } = await builder.createDatabase();
      const grandparent = db.add(Obj.make(TestSchema.Expando, { name: 'Grandparent' }));
      const parent = db.add(
        Obj.make(TestSchema.Expando, {
          [Obj.Parent]: grandparent,
          name: 'Parent',
        }),
      );
      const child = db.add(
        Obj.make(TestSchema.Expando, {
          [Obj.Parent]: parent,
          name: 'Child',
        }),
      );
      await db.flush();

      const objects = await db.query(Query.select(Filter.childOf(grandparent))).run();
      expect(objects).toHaveLength(2);
      const names = objects.map((o: any) => o.name).sort();
      expect(names).toEqual(['Child', 'Parent']);
    });

    test('chain of three echo objects - transitive negative', async () => {
      const { db } = await builder.createDatabase();
      const grandparent = db.add(Obj.make(TestSchema.Expando, { name: 'Grandparent' }));
      const parent = db.add(
        Obj.make(TestSchema.Expando, {
          [Obj.Parent]: grandparent,
          name: 'Parent',
        }),
      );
      const child = db.add(
        Obj.make(TestSchema.Expando, {
          [Obj.Parent]: parent,
          name: 'Child',
        }),
      );
      await db.flush();

      const objects = await db.query(Query.select(Filter.childOf(grandparent, { transitive: false }))).run();
      expect(objects).toHaveLength(1);
      expect(objects[0]).toMatchObject({ name: 'Parent' });
    });

    test('chain of three echo objects - non-transitive positive', async () => {
      const { db } = await builder.createDatabase();
      const parent = db.add(Obj.make(TestSchema.Expando, { name: 'Parent' }));
      const child = db.add(
        Obj.make(TestSchema.Expando, {
          [Obj.Parent]: parent,
          name: 'Child',
        }),
      );
      await db.flush();

      const objects = await db.query(Query.select(Filter.childOf(parent, { transitive: false }))).run();
      expect(objects).toHaveLength(1);
      expect(objects[0]).toMatchObject({ name: 'Child' });
    });

    test('chain of three echo objects - non-transitive negative', async () => {
      const { db } = await builder.createDatabase();
      const grandparent = db.add(Obj.make(TestSchema.Expando, { name: 'Grandparent' }));
      const parent = db.add(
        Obj.make(TestSchema.Expando, {
          [Obj.Parent]: grandparent,
          name: 'Parent',
        }),
      );
      const unrelated = db.add(Obj.make(TestSchema.Expando, { name: 'Unrelated' }));
      await db.flush();

      const objects = await db.query(Query.select(Filter.childOf(grandparent, { transitive: false }))).run();
      expect(objects).toHaveLength(1);
      expect(objects[0]).toMatchObject({ name: 'Parent' });
    });

    test('object in feed', async () => {
      const peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Task] });
      const db = await peer.createDatabase();
      const feed = db.add(Feed.make({ name: 'test-feed' }));
      await db.flush();

      await db.appendToFeed(feed, [Obj.make(TestSchema.Task, { title: 'Task in feed' })]);
      await db.flush();

      const objects = await db.query(Query.select(Filter.childOf(feed)).from(db, { includeFeeds: true })).run();
      expect(objects).toHaveLength(1);
      expect((objects[0] as TestSchema.Task).title).toEqual('Task in feed');
    });

    test('A -> Feed -> B: childOf([A]) matches B', async () => {
      const peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Task] });
      const db = await peer.createDatabase();
      const parentObj = db.add(Obj.make(TestSchema.Expando, { name: 'ParentA' }));
      const feed = db.add(
        Obj.make(Feed.Feed, {
          [Obj.Parent]: parentObj,
          name: 'child-feed',
        }),
      );
      await db.flush();

      await db.appendToFeed(feed, [Obj.make(TestSchema.Task, { title: 'Grandchild task' })]);
      await db.flush();

      const objects = await db.query(Query.select(Filter.childOf(parentObj)).from(db, { includeFeeds: true })).run();
      const taskResults = objects.filter((obj: any) => obj.title === 'Grandchild task');
      expect(taskResults.length).toBeGreaterThanOrEqual(1);
    });

    test('childOf with type filter prevents Feed from being returned', async () => {
      const peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Task] });
      const db = await peer.createDatabase();
      const parentObj = db.add(Obj.make(TestSchema.Expando, { name: 'ParentA' }));
      const feed = db.add(
        Obj.make(Feed.Feed, {
          [Obj.Parent]: parentObj,
          name: 'child-feed',
        }),
      );
      await db.flush();

      await db.appendToFeed(feed, [Obj.make(TestSchema.Task, { title: 'Task from feed' })]);
      await db.flush();

      const objects = await db
        .query(
          Query.select(Filter.and(Filter.childOf(parentObj), Filter.type(TestSchema.Task))).from(db, {
            includeFeeds: true,
          }),
        )
        .run();
      expect(objects).toHaveLength(1);
      expect((objects[0] as TestSchema.Task).title).toEqual('Task from feed');
      expect(objects.every((obj: any) => Obj.getTypename(obj) !== 'org.dxos.type.feed')).toBe(true);
    });

    test('negative test with 2 feeds - items from only one matching filter', async () => {
      const peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Task, TestSchema.Person] });
      const db = await peer.createDatabase();
      const feed1 = db.add(Feed.make({ name: 'feed-1' }));
      const feed2 = db.add(Feed.make({ name: 'feed-2' }));
      await db.flush();

      await db.appendToFeed(feed1, [Obj.make(TestSchema.Task, { title: 'Task in feed 1' })]);
      await db.appendToFeed(feed2, [Obj.make(TestSchema.Task, { title: 'Task in feed 2' })]);
      await db.flush();

      const objects1 = await db.query(Query.select(Filter.childOf(feed1)).from(db, { includeFeeds: true })).run();
      expect(objects1).toHaveLength(1);
      expect((objects1[0] as TestSchema.Task).title).toEqual('Task in feed 1');

      const objects2 = await db.query(Query.select(Filter.childOf(feed2)).from(db, { includeFeeds: true })).run();
      expect(objects2).toHaveLength(1);
      expect((objects2[0] as TestSchema.Task).title).toEqual('Task in feed 2');
    });

    test('childOf with limit returns feed items (regression: limit must not be pushed past child-of)', async ({
      expect,
    }) => {
      // Populates the space with enough unrelated objects that, if `.limit(N)` were pushed
      // into the wildcard SelectStep before the child-of FilterStep, the candidate set sliced
      // before filtering would not contain any of the feed items and the result would be empty.
      const peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Task] });
      const db = await peer.createDatabase();
      const feed = db.add(Feed.make({ name: 'limited-feed' }));
      for (let i = 0; i < 50; i++) {
        db.add(Obj.make(TestSchema.Expando, { name: `decoy-${i}` }));
      }
      await db.flush();

      await db.appendToFeed(feed, [
        Obj.make(TestSchema.Task, { title: 'A' }),
        Obj.make(TestSchema.Task, { title: 'B' }),
      ]);
      await db.flush();

      const objects = await db
        .query(Query.select(Filter.childOf(feed)).from(db, { includeFeeds: true }).limit(10))
        .run();
      expect(objects).toHaveLength(2);
      expect(objects.map((obj: any) => obj.title).sort()).toEqual(['A', 'B']);
    });

    test('childOf with Ref argument', async () => {
      const { db } = await builder.createDatabase();
      const parent = db.add(Obj.make(TestSchema.Expando, { name: 'Parent' }));
      const child = db.add(
        Obj.make(TestSchema.Expando, {
          [Obj.Parent]: parent,
          name: 'Child',
        }),
      );
      await db.flush();

      const parentRef = Ref.make(parent);
      const objects = await db.query(Query.select(Filter.childOf(parentRef))).run();
      expect(objects).toHaveLength(1);
      expect(objects[0]).toMatchObject({ name: 'Child' });
    });

    test('childOf with array of parents', async () => {
      const { db } = await builder.createDatabase();
      const parent1 = db.add(Obj.make(TestSchema.Expando, { name: 'Parent1' }));
      const parent2 = db.add(Obj.make(TestSchema.Expando, { name: 'Parent2' }));
      const child1 = db.add(
        Obj.make(TestSchema.Expando, {
          [Obj.Parent]: parent1,
          name: 'Child1',
        }),
      );
      const child2 = db.add(
        Obj.make(TestSchema.Expando, {
          [Obj.Parent]: parent2,
          name: 'Child2',
        }),
      );
      const unrelated = db.add(Obj.make(TestSchema.Expando, { name: 'Unrelated' }));
      await db.flush();

      const objects = await db.query(Query.select(Filter.childOf([parent1, parent2]))).run();
      expect(objects).toHaveLength(2);
      const names = objects.map((o: any) => o.name).sort();
      expect(names).toEqual(['Child1', 'Child2']);
    });
  });

  describe('Result caching', () => {
    test('repeated query() with the same serialized query returns the same instance and atom', async () => {
      const { db } = await builder.createDatabase();

      const first = db.query(Query.select(Filter.type(TestSchema.Expando, { value: 100 })));
      const second = db.query(Query.select(Filter.type(TestSchema.Expando, { value: 100 })));

      // The shared instance is what makes inline `query(...).atom` open a single subscription
      // instead of a fresh one on every re-evaluation.
      expect(second).toBe(first);
      expect(second.atom).toBe(first.atom);
    });

    test('different queries return different atoms', async () => {
      const { db } = await builder.createDatabase();

      const a = db.query(Query.select(Filter.type(TestSchema.Expando, { value: 100 })));
      const b = db.query(Query.select(Filter.type(TestSchema.Expando, { value: 200 })));

      expect(b).not.toBe(a);
      expect(b.atom).not.toBe(a.atom);
    });

    test('the same query against different databases returns different atoms', async () => {
      const { db: db1 } = await builder.createDatabase();
      const { db: db2 } = await builder.createDatabase();

      const query = () => Query.select(Filter.type(TestSchema.Expando, { value: 100 }));
      const result1 = db1.query(query());
      const result2 = db2.query(query());
      expect(result2).not.toBe(result1);
      expect(result2.atom).not.toBe(result1.atom);
    });

    test('cached result stays reactive across a shared subscription', async () => {
      const { db } = await builder.createDatabase();
      db.add(createTestObject({ value: 100 }));
      await db.flush();

      const query = db.query(Query.select(Filter.type(TestSchema.Expando, { value: 100 })));
      let count = 0;
      const unsubscribe = query.subscribe(() => {
        count++;
      });
      onTestFinished(unsubscribe);

      // A subsequent call returns the cached instance; updates flow through the one subscription.
      expect(db.query(Query.select(Filter.type(TestSchema.Expando, { value: 100 })))).toBe(query);

      db.add(createTestObject({ value: 100 }));
      await db.flush({ updates: true });
      expect(count).toEqual(1);
      expect(query.runSync()).toHaveLength(2);
    });
  });
});

const createObjects = async (peer: EchoTestPeer, db: EchoDatabase, options: { count: number }) => {
  const objects = range(options.count, () => db.add(createTestObject()));
  await db.flush();
  return objects;
};

const assertQuery = async (db: EchoDatabase, filter: Filter.Any, expected: any[]) => {
  const objects = await db.query(Query.select(filter)).run();
  expect(sortById(objects)).toEqual(expect.arrayContaining(sortById(expected)));
};

const sortById = (objects: any[]) => objects.sort((a, b) => a.id.localeCompare(b.id));
