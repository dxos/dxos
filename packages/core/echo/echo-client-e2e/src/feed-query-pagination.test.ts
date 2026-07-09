//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { Feed, Filter, Obj, Order, Query, Scope } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { TestSchema } from '@dxos/echo/testing';

describe('Feed query pagination', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('limit restricts feed-scoped results (from feed)', async ({ expect }) => {
    const { db, feed } = await setupFeedWithTasks(builder, ['A', 'B', 'C', 'D', 'E']);

    const results = await db.query(Query.select(Filter.type(TestSchema.Task)).limit(2).from(feed)).run();

    expect(results).toHaveLength(2);
  });

  test('limit restricts feed-scoped results (Scope.feed)', async ({ expect }) => {
    const { db, feedUri } = await setupFeedWithTasks(builder, ['A', 'B', 'C', 'D', 'E']);

    const results = await db.query(Query.select(Filter.type(TestSchema.Task)).limit(3).from(Scope.feed(feedUri))).run();

    expect(results).toHaveLength(3);
  });

  test('skip offsets feed-scoped results', async ({ expect }) => {
    const titles = ['first', 'second', 'third', 'fourth', 'fifth'];
    const { db, feed } = await setupFeedWithTasks(builder, titles);

    const all = await db.query(Query.select(Filter.type(TestSchema.Task)).from(feed)).run();
    const skipped = await db
      .query(
        Query.select(Filter.type(TestSchema.Task))
          .orderBy(() => Order.natural())
          .skip(2)
          .from(feed),
      )
      .run();

    expect(all).toHaveLength(5);
    expect(skipped).toHaveLength(3);
    expect(skipped.map((obj) => (obj as TestSchema.Task).title)).toEqual(titles.slice(2));
  });

  test('skip + limit returns a window in insertion order', async ({ expect }) => {
    const titles = ['a', 'b', 'c', 'd', 'e', 'f'];
    const { db, feed } = await setupFeedWithTasks(builder, titles);

    const window = await db
      .query(
        Query.select(Filter.type(TestSchema.Task))
          .orderBy(() => Order.natural())
          .skip(1)
          .limit(3)
          .from(feed),
      )
      .run();

    expect(window).toHaveLength(3);
    expect(window.map((obj) => (obj as TestSchema.Task).title)).toEqual(['b', 'c', 'd']);
  });

  test('orderBy natural preserves append order', async ({ expect }) => {
    const titles = ['one', 'two', 'three'];
    const { db, feed } = await setupFeedWithTasks(builder, titles);

    const results = await db
      .query(
        Query.select(Filter.type(TestSchema.Task))
          .orderBy(() => Order.natural())
          .from(feed),
      )
      .run();

    expect(results.map((obj) => (obj as TestSchema.Task).title)).toEqual(titles);
  });

  test('orderBy natural desc reverses append order', async ({ expect }) => {
    const titles = ['one', 'two', 'three'];
    const { db, feed } = await setupFeedWithTasks(builder, titles);

    const results = await db
      .query(
        Query.select(Filter.type(TestSchema.Task))
          .orderBy(() => Order.natural('desc'))
          .from(feed),
      )
      .run();

    expect(results.map((obj) => (obj as TestSchema.Task).title)).toEqual([...titles].reverse());
  });

  test('orderBy property with limit on feed scope', async ({ expect }) => {
    const { db, feed } = await setupFeedWithTasks(builder, ['charlie', 'alpha', 'bravo']);

    const results = await db
      .query(
        Query.select(Filter.type(TestSchema.Task))
          .orderBy((_) => Order.asc(_.title))
          .limit(2)
          .from(feed),
      )
      .run();

    expect(results).toHaveLength(2);
    expect(results.map((obj) => (obj as TestSchema.Task).title)).toEqual(['alpha', 'bravo']);
  });

  test('limit larger than feed size returns all items', async ({ expect }) => {
    const { db, feed } = await setupFeedWithTasks(builder, ['only']);

    const results = await db.query(Query.select(Filter.type(TestSchema.Task)).limit(100).from(feed)).run();

    expect(results).toHaveLength(1);
  });

  test('skip beyond feed size returns empty', async ({ expect }) => {
    const { db, feed } = await setupFeedWithTasks(builder, ['a', 'b']);

    const results = await db
      .query(
        Query.select(Filter.type(TestSchema.Task))
          .orderBy(() => Order.natural())
          .skip(10)
          .from(feed),
      )
      .run();

    expect(results).toHaveLength(0);
  });

  test('indexer path: type filter with limit after flush', async ({ expect }) => {
    const peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Task] });
    const db = await peer.createDatabase();
    const feed = db.add(Feed.make({ name: 'indexed-feed' }));

    for (const title of ['task-1', 'task-2', 'task-3', 'task-4']) {
      await db.appendToFeed(feed, [Obj.make(TestSchema.Task, { title })]);
    }
    await db.flush();

    const results = await db
      .query(
        Query.select(Filter.type(TestSchema.Task))
          .orderBy(() => Order.natural())
          .skip(1)
          .limit(2)
          .from(Scope.feed(Feed.getFeedUri(feed)!)),
      )
      .run();

    expect(results).toHaveLength(2);
    expect(results.map((obj) => (obj as TestSchema.Task).title)).toEqual(['task-2', 'task-3']);
  });

  test('feed scope excludes space objects when paginating', async ({ expect }) => {
    const peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Task] });
    const db = await peer.createDatabase();
    const feed = db.add(Feed.make({ name: 'mixed-scope' }));

    db.add(Obj.make(TestSchema.Task, { title: 'space-only' }));
    await db.appendToFeed(feed, [
      Obj.make(TestSchema.Task, { title: 'feed-1' }),
      Obj.make(TestSchema.Task, { title: 'feed-2' }),
      Obj.make(TestSchema.Task, { title: 'feed-3' }),
    ]);
    await db.flush();

    const results = await db
      .query(
        Query.select(Filter.type(TestSchema.Task))
          .orderBy(() => Order.natural())
          .limit(2)
          .from(feed),
      )
      .run();

    expect(results).toHaveLength(2);
    expect(results.every((obj) => ((obj as TestSchema.Task).title ?? '').startsWith('feed-'))).toBe(true);
  });
});

const setupFeedWithTasks = async (builder: EchoTestBuilder, titles: string[]) => {
  const peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Task] });
  const db = await peer.createDatabase();
  const feed = db.add(Feed.make({ name: 'pagination-feed' }));

  for (const title of titles) {
    await db.appendToFeed(feed, [Obj.make(TestSchema.Task, { title })]);
  }

  return { db, feed, feedUri: Feed.getFeedUri(feed)! };
};
