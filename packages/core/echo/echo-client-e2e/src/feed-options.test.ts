//
// Copyright 2026 DXOS.org
//

import * as Duration from 'effect/Duration';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { sleep } from '@dxos/async';
import { Feed, Filter, Obj, Query, Scope } from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-client';
import { EchoTestBuilder, type EchoTestPeer } from '@dxos/echo-client/testing';
import { TestSchema } from '@dxos/echo/testing';
import * as EffectEx from '@dxos/effect/EffectEx';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';

/** Short enough to wait out in a test; the store measures age from each block's append time. */
const MAX_AGE_MS = 2_000;

const queryFeed = (db: EchoDatabase, feed: Feed.Feed) => {
  const feedUri = Feed.getFeedUri(feed);
  invariant(feedUri, 'feed has no URI');
  return db.query(Query.select(Filter.type(TestSchema.Task)).from(Scope.feed(feedUri))).run();
};

const searchText = (db: EchoDatabase, text: string): Promise<TestSchema.Task[]> =>
  db.query(Query.select(Filter.text(text, { type: 'full-text' })).from(db, { includeFeeds: true })).run();

const appendTasks = (db: EchoDatabase, feed: Feed.Feed, titles: readonly string[]) =>
  db.appendToFeed(
    feed,
    titles.map((title) => Obj.make(TestSchema.Task, { title })),
  );

/** Writes the Feed object's change, then waits for the index pass that applies it to the store. */
const settle = (db: EchoDatabase) => db.flush({ secondaryIndexes: true });

/**
 * A writer database and a reader on its own client: a writer's queries also show the feed items it
 * appended until it lets go of them, so only a reader sees what the host answers.
 */
const openSpace = async (peer: EchoTestPeer) => {
  const spaceKey = PublicKey.random();
  const db = await peer.createDatabase(spaceKey);
  const reader = await peer.openDatabase(spaceKey, undefined, { client: await peer.createClient() });
  const feed = db.add(Feed.make({ name: 'log' }));
  return { db, reader, feed };
};

// Positions are assigned locally because a replica never trims a block it has not pushed.
describe('feed options', () => {
  let builder: EchoTestBuilder;
  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });
  afterEach(async () => {
    await builder.close();
  });

  // index-core T-3.
  test('disabling indexing hides a feed from text search but not from Feed.query, and re-enabling restores it', async ({
    expect,
  }) => {
    await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Task], assignQueuePositions: true });
    const { db, reader, feed } = await openSpace(peer);
    await appendTasks(db, feed, ['hello one', 'hello two', 'hello three']);
    await settle(db);
    expect(await searchText(reader, 'hello')).toHaveLength(3);

    await EffectEx.runPromise(Feed.setIndexing(feed, { enabled: false }));
    await settle(db);
    expect(await searchText(reader, 'hello')).toHaveLength(0);
    expect((await queryFeed(reader, feed)).map((task) => task.title).sort()).toEqual([
      'hello one',
      'hello three',
      'hello two',
    ]);

    await EffectEx.runPromise(Feed.setIndexing(feed, { enabled: true }));
    await settle(db);
    // The backfill runs over the passes after the one that applied the options.
    await expect.poll(async () => (await searchText(reader, 'hello')).length, { timeout: 5_000 }).toBe(3);
  });

  test('a space query that includes feeds returns the items of a feed with indexing disabled', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Task], assignQueuePositions: true });
    const { db, reader, feed } = await openSpace(peer);
    await appendTasks(db, feed, ['one', 'two']);
    await EffectEx.runPromise(Feed.setIndexing(feed, { enabled: false }));
    await settle(db);
    const tasks = await reader
      .query(Query.select(Filter.type(TestSchema.Task)).from(reader, { includeFeeds: true }))
      .run();
    expect(tasks.map((task) => task.title).sort()).toEqual(['one', 'two']);
  });

  // index-core T-4.
  test('an item retention trims leaves the text index', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Task], assignQueuePositions: true });
    const { db, reader, feed } = await openSpace(peer);
    await EffectEx.runPromise(Feed.setRetention(feed, { maxLength: 5 }));
    await appendTasks(db, feed, ['oldest', 'second', 'third', 'fourth', 'fifth']);
    await settle(db);
    expect(await searchText(reader, 'oldest')).toHaveLength(1);

    await appendTasks(db, feed, ['sixth']);
    await settle(db);
    await expect.poll(async () => (await searchText(reader, 'oldest')).length, { timeout: 5_000 }).toBe(0);
    expect(await searchText(reader, 'sixth')).toHaveLength(1);
  });

  // feed T-1.
  test('retention by length keeps the newest items', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Task], assignQueuePositions: true });
    const { db, reader, feed } = await openSpace(peer);
    const titles = Array.from({ length: 13 }, (_, index) => `item ${String(index).padStart(2, '0')}`);
    await appendTasks(db, feed, titles.slice(0, 10));
    await EffectEx.runPromise(Feed.setRetention(feed, { maxLength: 5 }));
    await settle(db);

    await appendTasks(db, feed, titles.slice(10));
    await settle(db);
    await expect
      .poll(async () => (await queryFeed(reader, feed)).map((task) => task.title).sort(), { timeout: 5_000 })
      .toEqual(titles.slice(8));
  });

  // feed T-2, at a scale of seconds: the index holds the expired item's row until the next trim, so the
  // query must hide it.
  test('retention by age hides an expired item before any trim, and the next append deletes it', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Task], assignQueuePositions: true });
    const { db, reader, feed } = await openSpace(peer);
    // Counts the namespace's blocks, which are the feed's: it is the space's only data feed.
    const storedBlocks = async () => (await db.getFeedSyncState(feed)).totalBlocks;
    await EffectEx.runPromise(Feed.setRetention(feed, { maxAge: Duration.millis(MAX_AGE_MS) }));
    await settle(db);

    await appendTasks(db, feed, ['old']);
    await settle(db);
    await sleep(MAX_AGE_MS * 0.6);
    await appendTasks(db, feed, ['new']);
    await settle(db);
    await sleep(MAX_AGE_MS * 0.6);

    expect((await queryFeed(reader, feed)).map((task) => task.title)).toEqual(['new']);
    expect(await storedBlocks()).toBe(2);

    await appendTasks(db, feed, ['newest']);
    await settle(db);
    expect(await storedBlocks()).toBe(2);
  });

  // feed T-2: the expired rows are excluded before the page limit, which would otherwise count them.
  for (const queryExecutor of ['sql', 'memory'] as const) {
    test(`a limited query over a feed with maxAge returns a full page of live items (${queryExecutor})`, async ({
      expect,
    }) => {
      await using peer = await builder.createPeer({
        types: [Feed.Feed, TestSchema.Task],
        assignQueuePositions: true,
        queryExecutor,
      });
      const { db, reader, feed } = await openSpace(peer);
      await EffectEx.runPromise(Feed.setRetention(feed, { maxAge: Duration.millis(MAX_AGE_MS) }));
      await settle(db);

      // Many expired items, so a page cut before the age filter would almost surely hold some.
      await appendTasks(
        db,
        feed,
        Array.from({ length: 10 }, (_, index) => `old ${index}`),
      );
      await settle(db);
      await sleep(MAX_AGE_MS * 0.6);
      await appendTasks(db, feed, ['new 0', 'new 1']);
      await settle(db);
      await sleep(MAX_AGE_MS * 0.6);

      const page = await reader.query(Query.select(Filter.type(TestSchema.Task)).limit(2).from(feed)).run();
      expect(page.map((task) => task.title).sort()).toEqual(['new 0', 'new 1']);
    });
  }
});
