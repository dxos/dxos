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
      .query(Query.select(Filter.type(TestSchema.Task)).orderBy(Order.natural()).skip(2).from(feed))
      .run();

    expect(all).toHaveLength(5);
    expect(skipped).toHaveLength(3);
    expect(skipped.map((obj) => (obj as TestSchema.Task).title)).toEqual(titles.slice(2));
  });

  test('skip + limit returns a window in insertion order', async ({ expect }) => {
    const titles = ['a', 'b', 'c', 'd', 'e', 'f'];
    const { db, feed } = await setupFeedWithTasks(builder, titles);

    const window = await db
      .query(Query.select(Filter.type(TestSchema.Task)).orderBy(Order.natural()).skip(1).limit(3).from(feed))
      .run();

    expect(window).toHaveLength(3);
    expect(window.map((obj) => (obj as TestSchema.Task).title)).toEqual(['b', 'c', 'd']);
  });

  test('orderBy natural preserves append order', async ({ expect }) => {
    const titles = ['one', 'two', 'three'];
    const { db, feed } = await setupFeedWithTasks(builder, titles);

    const results = await db
      .query(Query.select(Filter.type(TestSchema.Task)).orderBy(Order.natural()).from(feed))
      .run();

    expect(results.map((obj) => (obj as TestSchema.Task).title)).toEqual(titles);
  });

  test('orderBy natural desc reverses append order', async ({ expect }) => {
    const titles = ['one', 'two', 'three'];
    const { db, feed } = await setupFeedWithTasks(builder, titles);

    const results = await db
      .query(Query.select(Filter.type(TestSchema.Task)).orderBy(Order.natural('desc')).from(feed))
      .run();

    expect(results.map((obj) => (obj as TestSchema.Task).title)).toEqual([...titles].reverse());
  });

  test('orderBy property with limit on feed scope', async ({ expect }) => {
    const { db, feed } = await setupFeedWithTasks(builder, ['charlie', 'alpha', 'bravo']);

    const results = await db
      .query(Query.select(Filter.type(TestSchema.Task)).orderBy(Order.property('title', 'asc')).limit(2).from(feed))
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
      .query(Query.select(Filter.type(TestSchema.Task)).orderBy(Order.natural()).skip(10).from(feed))
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
          .orderBy(Order.natural())
          .skip(1)
          .limit(2)
          .from(Scope.feed(Feed.getFeedUri(feed)!)),
      )
      .run();

    expect(results).toHaveLength(2);
    expect(results.map((obj) => (obj as TestSchema.Task).title)).toEqual(['task-2', 'task-3']);
  });

  test('cursor filter resumes after a position', async ({ expect }) => {
    // Cursors exist only where a position authority assigns them.
    const peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Task], assignQueuePositions: true });
    const db = await peer.createDatabase();
    const feed = db.add(Feed.make({ name: 'cursor-feed' }));

    await db.appendToFeed(
      feed,
      ['a', 'b', 'c', 'd'].map((title) => Obj.make(TestSchema.Task, { title })),
    );
    await db.flush();

    const feedUri = Feed.getFeedUri(feed)!;
    const all = await db
      .query(Query.select(Filter.everything()).orderBy(Order.natural()).from(Scope.feed(feedUri)))
      .run();
    const cursor = Feed.getCursor(all[1])!;

    const after = await db.query(Query.select(Filter.feedCursor({ begin: cursor })).from(Scope.feed(feedUri))).run();
    expect(after.map((obj) => (obj as TestSchema.Task).title).sort()).toEqual(['c', 'd']);

    const page = await db
      .query(
        Query.select(Filter.feedCursor({ begin: cursor }))
          .limit(1)
          .from(Scope.feed(feedUri)),
      )
      .run();
    expect(page.map((obj) => (obj as TestSchema.Task).title)).toEqual(['c']);

    // The start sentinel bounds nothing, but still reads in append order.
    const fromStart = await db
      .query(Query.select(Filter.feedCursor({ begin: Feed.START })).from(Scope.feed(feedUri)))
      .run();
    expect(fromStart.map((obj) => (obj as TestSchema.Task).title)).toEqual(['a', 'b', 'c', 'd']);

    // A limited read from the start takes the first items by position, not whichever the scan met
    // first — a page of items a reader cannot act on would stall it with work still behind them.
    const firstPage = await db
      .query(
        Query.select(Filter.feedCursor({ begin: Feed.START }))
          .limit(2)
          .from(Scope.feed(feedUri)),
      )
      .run();
    expect(firstPage.map((obj) => (obj as TestSchema.Task).title)).toEqual(['a', 'b']);

    // `end` bounds the read from above, excluding the item it names.
    const bounded = await db
      .query(
        Query.select(Filter.feedCursor({ begin: Feed.START, end: Feed.getCursor(all[2])! })).from(Scope.feed(feedUri)),
      )
      .run();
    expect(bounded.map((obj) => (obj as TestSchema.Task).title)).toEqual(['a', 'b']);

    const between = await db
      .query(Query.select(Filter.feedCursor({ begin: cursor, end: Feed.getCursor(all[3])! })).from(Scope.feed(feedUri)))
      .run();
    expect(between.map((obj) => (obj as TestSchema.Task).title)).toEqual(['c']);

    // A cursor past the tail yields nothing rather than falling back to a full scan.
    const exhausted = await db
      .query(Query.select(Filter.feedCursor({ begin: Feed.Cursor.make('1000') })).from(Scope.feed(feedUri)))
      .run();
    expect(exhausted).toHaveLength(0);
  });

  test('cursor filter applies to a type-selected query', async ({ expect }) => {
    const peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Task], assignQueuePositions: true });
    const db = await peer.createDatabase();
    const feed = db.add(Feed.make({ name: 'cursor-typed-feed' }));

    await db.appendToFeed(
      feed,
      ['a', 'b', 'c'].map((title) => Obj.make(TestSchema.Task, { title })),
    );
    await db.flush();

    const feedUri = Feed.getFeedUri(feed)!;
    const all = await db
      .query(Query.select(Filter.type(TestSchema.Task)).orderBy(Order.natural()).from(Scope.feed(feedUri)))
      .run();
    const cursor = Feed.getCursor(all[0])!;

    const after = await db
      .query(
        Query.select(Filter.and(Filter.type(TestSchema.Task), Filter.feedCursor({ begin: cursor }))).from(
          Scope.feed(feedUri),
        ),
      )
      .run();
    expect(after.map((obj) => (obj as TestSchema.Task).title).sort()).toEqual(['b', 'c']);
  });

  test('tail read windows from the end of the feed', async ({ expect }) => {
    const peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Task], assignQueuePositions: true });
    const db = await peer.createDatabase();
    const feed = db.add(Feed.make({ name: 'tail-feed' }));

    await db.appendToFeed(
      feed,
      ['a', 'b', 'c', 'd', 'e'].map((title) => Obj.make(TestSchema.Task, { title })),
    );
    await db.flush();

    const feedUri = Feed.getFeedUri(feed)!;
    const titles = (results: readonly unknown[]) => results.map((obj) => (obj as TestSchema.Task).title);
    const all = await db
      .query(Query.select(Filter.type(TestSchema.Task)).orderBy(Order.natural()).from(Scope.feed(feedUri)))
      .run();

    // A plain cursor read keeps the range's first items; a tail read keeps its last.
    const head = await db.query(Query.select(Filter.feedCursor()).limit(2).from(Scope.feed(feedUri))).run();
    expect(titles(head)).toEqual(['a', 'b']);

    const tail = await db.query(Query.select(Filter.feedTail()).limit(2).from(Scope.feed(feedUri))).run();
    expect(titles(tail).sort()).toEqual(['d', 'e']);

    // `end` pages backwards past the previous page's oldest item.
    const earlier = await db
      .query(
        Query.select(Filter.feedTail({ end: Feed.getCursor(all[3])! }))
          .limit(2)
          .from(Scope.feed(feedUri)),
      )
      .run();
    expect(titles(earlier).sort()).toEqual(['b', 'c']);

    // A page short of its limit is the feed's start, which is how a reader knows to stop paging.
    const exhausted = await db
      .query(
        Query.select(Filter.feedTail({ end: Feed.getCursor(all[1])! }))
          .limit(2)
          .from(Scope.feed(feedUri)),
      )
      .run();
    expect(titles(exhausted)).toEqual(['a']);

    // A tail read composes with a type select, which is what a windowed view of one type needs.
    const typed = await db
      .query(
        Query.select(Filter.and(Filter.type(TestSchema.Task), Filter.feedTail()))
          .limit(1)
          .from(Scope.feed(feedUri)),
      )
      .run();
    expect(titles(typed)).toEqual(['e']);

    // Unlimited, a tail read is the whole range — the window is what the limit makes it.
    const unlimited = await db.query(Query.select(Filter.feedTail()).from(Scope.feed(feedUri))).run();
    expect(titles(unlimited).sort()).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  test('an unbounded tail read includes blocks with no position yet', async ({ expect }) => {
    // No position authority here, so nothing this peer appends is ever positioned — the state a
    // block is in between a local write and its acknowledgement, which a chat must keep showing.
    const peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Task] });
    const db = await peer.createDatabase();
    const feed = db.add(Feed.make({ name: 'unpositioned-feed' }));

    await db.appendToFeed(
      feed,
      ['a', 'b'].map((title) => Obj.make(TestSchema.Task, { title })),
    );
    await db.flush();

    const feedUri = Feed.getFeedUri(feed)!;
    const titles = (results: readonly unknown[]) => results.map((obj) => (obj as TestSchema.Task).title).sort();

    // A plain cursor read is over positioned blocks only, so it sees none of them.
    const cursor = await db.query(Query.select(Filter.feedCursor()).from(Scope.feed(feedUri))).run();
    expect(cursor).toHaveLength(0);

    const tail = await db.query(Query.select(Filter.feedTail()).from(Scope.feed(feedUri))).run();
    expect(titles(tail)).toEqual(['a', 'b']);

    // Bounding above puts the window below the feed's end, where an unpositioned block is not.
    const bounded = await db
      .query(Query.select(Filter.feedTail({ end: Feed.Cursor.make('1000') })).from(Scope.feed(feedUri)))
      .run();
    expect(bounded).toHaveLength(0);
  });

  test('cursor filter is rejected outside a feed scope', async ({ expect }) => {
    const peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Task], assignQueuePositions: true });
    const db = await peer.createDatabase();
    const feed = db.add(Feed.make({ name: 'rejected-scope' }));
    await db.appendToFeed(feed, [Obj.make(TestSchema.Task, { title: 'a' })]);
    await db.flush();
    const feedUri = Feed.getFeedUri(feed)!;

    // An automerge object carries no position, so the bound has no answer to give — better a refusal
    // than a query that silently returns everything. The start sentinel bounds nothing, but it is
    // still a cursor and is refused just the same rather than quietly running unbounded.
    for (const cursor of [Feed.Cursor.make('0'), Feed.START]) {
      await expect(
        db.query(Query.select(Filter.feedCursor({ begin: cursor })).from(Scope.space())).run(),
      ).rejects.toThrow(/feed scope/);
      await expect(
        db.query(Query.select(Filter.feedCursor({ begin: cursor })).from(Scope.feed(feedUri), Scope.space())).run(),
      ).rejects.toThrow(/feed scope/);
    }
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
      .query(Query.select(Filter.type(TestSchema.Task)).orderBy(Order.natural()).limit(2).from(feed))
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
