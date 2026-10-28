//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { Feed, Filter, Obj, Order, Query, Scope } from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-client';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { TestSchema } from '@dxos/echo/testing';
import * as EffectEx from '@dxos/effect/EffectEx';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';

type Item = TestSchema.Task | TestSchema.Person;

const label = (obj: Item): string => (Obj.instanceOf(TestSchema.Task, obj) ? obj.title : obj.name) ?? '';

/**
 * Feed queries run twice: once answered by the index, once by a scan of the feed store with indexing
 * disabled. The indexed run is the reference; the scan must return the same items in the same order.
 */
const MODES = [
  { indexing: true, queryExecutor: 'sql' },
  { indexing: false, queryExecutor: 'sql' },
  { indexing: true, queryExecutor: 'memory' },
  { indexing: false, queryExecutor: 'memory' },
] as const;

for (const { indexing, queryExecutor } of MODES) {
  describe(`feed queries (indexing ${indexing ? 'enabled' : 'disabled'}, ${queryExecutor})`, () => {
    let builder: EchoTestBuilder;
    beforeEach(async () => {
      builder = await new EchoTestBuilder().open();
    });
    afterEach(async () => {
      await builder.close();
    });

    /**
     * A writer, and a reader on its own client: the writer's queries also show the items it appended
     * until it lets go of them, so only the reader sees what the host answers. Positions are assigned
     * locally so the items carry cursors.
     */
    const setup = async (items: readonly Item[]) => {
      const peer = await builder.createPeer({
        types: [Feed.Feed, TestSchema.Task, TestSchema.Person],
        assignQueuePositions: true,
        queryExecutor,
      });
      const spaceKey = PublicKey.random();
      const db = await peer.createDatabase(spaceKey);
      const reader = await peer.openDatabase(spaceKey, undefined, { client: await peer.createClient() });
      const feed = db.add(Feed.make({ name: 'feed' }));
      if (!indexing) {
        await EffectEx.runPromise(Feed.setIndexing(feed, { enabled: false }));
      }
      if (items.length > 0) {
        await db.appendToFeed(feed, [...items]);
      }
      await db.flush({ secondaryIndexes: true });
      const feedUri = Feed.getFeedUri(feed);
      invariant(feedUri, 'feed has no URI');
      return { peer, db, reader, feed, feedUri, scope: Scope.feed(feedUri) };
    };

    const tasks = (titles: readonly string[]) => titles.map((title) => Obj.make(TestSchema.Task, { title }));

    describe('selection', () => {
      test('everything', async ({ expect }) => {
        const { reader, scope } = await setup(tasks(['a', 'b', 'c']));
        const results = await reader.query(Query.select(Filter.everything()).from(scope)).run();
        expect(results.map(label).sort()).toEqual(['a', 'b', 'c']);
      });

      test('by type', async ({ expect }) => {
        const { reader, scope } = await setup([
          Obj.make(TestSchema.Person, { name: 'john' }),
          Obj.make(TestSchema.Task, { title: 'write tests' }),
          Obj.make(TestSchema.Person, { name: 'jane' }),
        ]);
        const people = await reader.query(Query.select(Filter.type(TestSchema.Person)).from(scope)).run();
        expect(people.map(label).sort()).toEqual(['jane', 'john']);
        const work = await reader.query(Query.select(Filter.type(TestSchema.Task)).from(scope)).run();
        expect(work.map(label)).toEqual(['write tests']);
      });

      test('by type with a property predicate', async ({ expect }) => {
        const { reader, scope } = await setup([
          Obj.make(TestSchema.Person, { name: 'john' }),
          Obj.make(TestSchema.Person, { name: 'jane' }),
        ]);
        const results = await reader
          .query(Query.select(Filter.type(TestSchema.Person, { name: 'jane' })).from(scope))
          .run();
        expect(results.map(label)).toEqual(['jane']);
      });

      test('by id', async ({ expect }) => {
        const items = tasks(['a', 'b', 'c']);
        const { reader, scope } = await setup(items);
        const results = await reader.query(Query.select(Filter.id(items[1].id)).from(scope)).run();
        expect(results.map((obj) => obj.id)).toEqual([items[1].id]);
      });

      test('excludes space objects', async ({ expect }) => {
        const { db, reader, scope } = await setup(tasks(['feed-1', 'feed-2']));
        db.add(Obj.make(TestSchema.Task, { title: 'space-only' }));
        await db.flush({ secondaryIndexes: true });
        const results = await reader.query(Query.select(Filter.type(TestSchema.Task)).from(scope)).run();
        expect(results.map(label).sort()).toEqual(['feed-1', 'feed-2']);
      });

      test('omits a deleted item', async ({ expect }) => {
        const { db, reader, feed, scope } = await setup(tasks(['a', 'b', 'c']));
        const [first] = await reader
          .query(Query.select(Filter.everything()).orderBy(Order.natural()).from(scope))
          .run();
        await db.deleteFromFeed(feed, [first]);
        await db.flush({ secondaryIndexes: true });
        const results = await reader
          .query(Query.select(Filter.everything()).orderBy(Order.natural()).from(scope))
          .run();
        expect(results.map(label)).toEqual(['b', 'c']);
      });

      test('returns the latest version of an item appended twice', async ({ expect }) => {
        const item = Obj.make(TestSchema.Task, { title: 'draft' });
        const { db, reader, feed, scope } = await setup([item]);
        await db.appendToFeed(feed, [Obj.make(TestSchema.Task, { id: item.id, title: 'final' })]);
        await db.flush({ secondaryIndexes: true });
        const results = await reader.query(Query.select(Filter.type(TestSchema.Task)).from(scope)).run();
        expect(results.map(label)).toEqual(['final']);
      });
    });

    describe('order and pages', () => {
      const titles = ['a', 'b', 'c', 'd', 'e'];

      test('natural order is append order', async ({ expect }) => {
        const { reader, scope } = await setup(tasks(titles));
        const results = await reader
          .query(Query.select(Filter.type(TestSchema.Task)).orderBy(Order.natural()).from(scope))
          .run();
        expect(results.map(label)).toEqual(titles);
      });

      test('natural desc with a limit returns the newest items', async ({ expect }) => {
        const { reader, scope } = await setup(tasks(titles));
        const results = await reader
          .query(Query.select(Filter.everything()).orderBy(Order.natural('desc')).limit(2).from(scope))
          .run();
        expect(results.map(label)).toEqual(['e', 'd']);
      });

      test('skip and limit return a window in append order', async ({ expect }) => {
        const { reader, scope } = await setup(tasks(titles));
        const results = await reader
          .query(Query.select(Filter.type(TestSchema.Task)).orderBy(Order.natural()).skip(1).limit(3).from(scope))
          .run();
        expect(results.map(label)).toEqual(['b', 'c', 'd']);
      });

      test('a limit counts only the selected type', async ({ expect }) => {
        const { reader, scope } = await setup([
          Obj.make(TestSchema.Person, { name: 'john' }),
          ...tasks(['a', 'b']),
          Obj.make(TestSchema.Person, { name: 'jane' }),
          ...tasks(['c']),
        ]);
        const results = await reader
          .query(Query.select(Filter.type(TestSchema.Task)).orderBy(Order.natural()).limit(2).from(scope))
          .run();
        expect(results.map(label)).toEqual(['a', 'b']);
      });

      test('property order with a limit', async ({ expect }) => {
        const { reader, scope } = await setup(tasks(['charlie', 'alpha', 'bravo']));
        const results = await reader
          .query(
            Query.select(Filter.type(TestSchema.Task)).orderBy(Order.property('title', 'asc')).limit(2).from(scope),
          )
          .run();
        expect(results.map(label)).toEqual(['alpha', 'bravo']);
      });

      test('skip beyond the feed returns nothing', async ({ expect }) => {
        const { reader, scope } = await setup(tasks(['a', 'b']));
        const results = await reader
          .query(Query.select(Filter.everything()).orderBy(Order.natural()).skip(10).from(scope))
          .run();
        expect(results).toHaveLength(0);
      });
    });

    describe('cursors', () => {
      const readAll = async (reader: EchoDatabase, scope: ReturnType<typeof Scope.feed>) => {
        const all = await reader.query(Query.select(Filter.everything()).orderBy(Order.natural()).from(scope)).run();
        return all.map((obj) => {
          const cursor = Feed.getCursor(obj);
          invariant(cursor, 'item has no cursor');
          return cursor;
        });
      };

      test('begin resumes after a position', async ({ expect }) => {
        const { reader, scope } = await setup(tasks(['a', 'b', 'c', 'd']));
        const cursors = await readAll(reader, scope);
        const after = await reader.query(Query.select(Filter.feedCursor({ begin: cursors[1] })).from(scope)).run();
        expect(after.map(label)).toEqual(['c', 'd']);
      });

      test('begin with a limit takes the next page', async ({ expect }) => {
        const { reader, scope } = await setup(tasks(['a', 'b', 'c', 'd']));
        const cursors = await readAll(reader, scope);
        const page = await reader
          .query(
            Query.select(Filter.feedCursor({ begin: cursors[1] }))
              .limit(1)
              .from(scope),
          )
          .run();
        expect(page.map(label)).toEqual(['c']);
      });

      test('the start sentinel reads every item in append order', async ({ expect }) => {
        const { reader, scope } = await setup(tasks(['a', 'b', 'c', 'd']));
        const all = await reader.query(Query.select(Filter.feedCursor({ begin: Feed.START })).from(scope)).run();
        expect(all.map(label)).toEqual(['a', 'b', 'c', 'd']);
        const firstPage = await reader
          .query(
            Query.select(Filter.feedCursor({ begin: Feed.START }))
              .limit(2)
              .from(scope),
          )
          .run();
        expect(firstPage.map(label)).toEqual(['a', 'b']);
      });

      test('end bounds the read and excludes the item it names', async ({ expect }) => {
        const { reader, scope } = await setup(tasks(['a', 'b', 'c', 'd']));
        const cursors = await readAll(reader, scope);
        const bounded = await reader
          .query(Query.select(Filter.feedCursor({ begin: Feed.START, end: cursors[2] })).from(scope))
          .run();
        expect(bounded.map(label)).toEqual(['a', 'b']);
        const between = await reader
          .query(Query.select(Filter.feedCursor({ begin: cursors[1], end: cursors[3] })).from(scope))
          .run();
        expect(between.map(label)).toEqual(['c']);
      });

      test('a cursor past the tail returns nothing', async ({ expect }) => {
        const { reader, scope } = await setup(tasks(['a', 'b']));
        const results = await reader
          .query(Query.select(Filter.feedCursor({ begin: Feed.Cursor.make('1000') })).from(scope))
          .run();
        expect(results).toHaveLength(0);
      });

      test('a cursor combines with a type filter', async ({ expect }) => {
        const { reader, scope } = await setup([
          ...tasks(['a']),
          Obj.make(TestSchema.Person, { name: 'john' }),
          ...tasks(['b', 'c']),
        ]);
        const cursors = await readAll(reader, scope);
        const after = await reader
          .query(
            Query.select(Filter.and(Filter.type(TestSchema.Task), Filter.feedCursor({ begin: cursors[0] }))).from(
              scope,
            ),
          )
          .run();
        expect(after.map(label)).toEqual(['b', 'c']);
      });

      test('paging by cursor visits every item once', async ({ expect }) => {
        const titles = Array.from({ length: 7 }, (_, index) => `item ${index}`);
        const { reader, scope } = await setup(tasks(titles));
        const seen: string[] = [];
        let begin: Feed.Cursor = Feed.START;
        for (let page = 0; page < titles.length; page++) {
          const items = await reader.query(Query.select(Filter.feedCursor({ begin })).limit(3).from(scope)).run();
          if (items.length === 0) {
            break;
          }
          seen.push(...items.map(label));
          const last = Feed.getCursor(items[items.length - 1]);
          invariant(last, 'item has no cursor');
          begin = last;
        }
        expect(seen).toEqual(titles);
      });

      test('a cursor read sees items appended later', async ({ expect }) => {
        const { db, reader, feed, scope } = await setup(tasks(['a', 'b']));
        const cursors = await readAll(reader, scope);
        await db.appendToFeed(feed, tasks(['c']));
        await db.flush({ secondaryIndexes: true });
        const after = await reader.query(Query.select(Filter.feedCursor({ begin: cursors[1] })).from(scope)).run();
        expect(after.map(label)).toEqual(['c']);
      });
    });

    describe('live queries', () => {
      test('a subscription sees a later append', async ({ expect }) => {
        const { db, reader, feed, scope } = await setup(tasks(['a']));
        const query = reader.query(Query.select(Filter.type(TestSchema.Task)).from(scope));
        const unsubscribe = query.subscribe(() => {}, { fire: true });
        await expect.poll(() => query.results.map(label)).toEqual(['a']);

        await db.appendToFeed(feed, tasks(['b']));
        await db.flush({ secondaryIndexes: true });
        await expect.poll(() => query.results.map(label).sort()).toEqual(['a', 'b']);
        unsubscribe();
      });

      test('a subscription sees an item replaced by a newer version', async ({ expect }) => {
        const item = Obj.make(TestSchema.Task, { title: 'draft' });
        const { db, reader, feed, scope } = await setup([item]);
        const query = reader.query(Query.select(Filter.type(TestSchema.Task)).from(scope));
        const unsubscribe = query.subscribe(() => {}, { fire: true });
        await expect.poll(() => query.results.map(label)).toEqual(['draft']);

        await db.appendToFeed(feed, [Obj.make(TestSchema.Task, { id: item.id, title: 'final' })]);
        await db.flush({ secondaryIndexes: true });
        await expect.poll(() => query.results.map(label)).toEqual(['final']);
        unsubscribe();
      });
    });
  });
}
