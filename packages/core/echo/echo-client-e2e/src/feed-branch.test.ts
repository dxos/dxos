//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Database, Feed, Filter, Obj, Order, Query, Scope } from '@dxos/echo';
import { FeedBranchMismatchError } from '@dxos/echo-client';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { TestSchema } from '@dxos/echo/testing';
import * as EffectEx from '@dxos/effect/EffectEx';
import { FeedProtocol } from '@dxos/protocols';

describe('feed branches', () => {
  let builder: EchoTestBuilder;
  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });
  afterEach(async () => {
    await builder.close();
  });

  // The fork flag and the predecessor ride on the block; the store infers the branch and stamps all three on read.
  test('a fork starts a branch at its fork point, and continuations follow the head of their branch', async ({
    expect,
  }) => {
    await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person], assignQueuePositions: true });
    const db = await peer.createDatabase();

    await Effect.gen(function* () {
      const feed = yield* makeFeed();
      const a1 = Obj.make(TestSchema.Person, { name: 'A1' });
      const a2 = Obj.make(TestSchema.Person, { name: 'A2' });
      yield* Feed.append(feed, [a1, a2]);

      const branch = yield* Feed.fork(feed, [Obj.make(TestSchema.Person, { name: 'B1' })], { at: a2 });
      yield* Feed.append(feed, [Obj.make(TestSchema.Person, { name: 'B2' })], { branch });
      yield* Feed.append(feed, [Obj.make(TestSchema.Person, { name: 'A3' })]);
      yield* Database.flush();

      const byName = yield* queryByName(feed);
      const block = (name: string) => Feed.getBlockId(byName(name));
      expect(Feed.getBranch(byName('A1'))).toBeUndefined();
      expect(Feed.getBranch(byName('A2'))).toBeUndefined();
      expect(branch).toEqual(block('B1'));
      expect(Feed.getBranch(byName('B1'))).toEqual(branch);
      expect(Feed.isFork(byName('B1'))).toBe(true);
      expect(Feed.getPredecessor(byName('B1'))).toEqual(block('A2'));
      expect(Feed.getBranch(byName('B2'))).toEqual(branch);
      expect(Feed.isFork(byName('B2'))).toBe(false);
      expect(Feed.getPredecessor(byName('B2'))).toEqual(block('B1'));
      // A3 continues the root branch, not the branch appended just before it.
      expect(Feed.getBranch(byName('A3'))).toBeUndefined();
      expect(Feed.getPredecessor(byName('A3'))).toEqual(block('A2'));
    }).pipe(Effect.provide(Database.layer(db)), EffectEx.runAndForwardErrors);
  });

  test('readBranch over queried items returns the root and branch views', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person], assignQueuePositions: true });
    const db = await peer.createDatabase();

    await Effect.gen(function* () {
      const feed = yield* makeFeed();
      const a2 = Obj.make(TestSchema.Person, { name: 'A2' });
      yield* Feed.append(feed, [Obj.make(TestSchema.Person, { name: 'A1' }), a2]);
      yield* Feed.append(feed, [Obj.make(TestSchema.Person, { name: 'A3' })]);
      const branch = yield* Feed.fork(feed, [Obj.make(TestSchema.Person, { name: 'B1' })], { at: a2 });
      yield* Feed.append(feed, [Obj.make(TestSchema.Person, { name: 'A4' })]);
      yield* Feed.append(feed, [Obj.make(TestSchema.Person, { name: 'B2' })], { branch });
      yield* Database.flush();

      const results = yield* Feed.query(feed, Filter.type(TestSchema.Person), { branches: 'all' }).run;
      expect(results.every((item) => Number.isFinite(Feed.getPosition(item)))).toBe(true);
      const inAppendOrder = [...results].sort((left, right) => Feed.getPosition(left) - Feed.getPosition(right));

      const root = Feed.readBranch(inAppendOrder);
      expect(root.items.map((item) => item.name)).toEqual(['A1', 'A2', 'A3', 'A4']);
      expect(root.shallow).toBe(false);

      const forked = Feed.readBranch(inAppendOrder, branch);
      expect(forked.items.map((item) => item.name)).toEqual(['A1', 'A2', 'B1', 'B2']);
      expect(forked.shallow).toBe(false);
    }).pipe(Effect.provide(Database.layer(db)), EffectEx.runAndForwardErrors);
  });

  test('a fork with several items makes the first the base and the rest continue the branch', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
    const db = await peer.createDatabase();

    await Effect.gen(function* () {
      const feed = yield* makeFeed();
      const a1 = Obj.make(TestSchema.Person, { name: 'A1' });
      yield* Feed.append(feed, [a1]);
      const branch = yield* Feed.fork(
        feed,
        [Obj.make(TestSchema.Person, { name: 'B1' }), Obj.make(TestSchema.Person, { name: 'B2' })],
        { at: a1 },
      );
      yield* Database.flush();

      const byName = yield* queryByName(feed);
      expect(Feed.isFork(byName('B1'))).toBe(true);
      expect(Feed.isFork(byName('B2'))).toBe(false);
      expect(Feed.getBranch(byName('B2'))).toEqual(branch);
    }).pipe(Effect.provide(Database.layer(db)), EffectEx.runAndForwardErrors);
  });

  // D-54: an update of a base item continues its branch rather than forking again.
  test('an Obj.update of a base item keeps its branch across a reload', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
    const db = await peer.createDatabase();

    const { b1, branch } = await Effect.gen(function* () {
      const feed = yield* makeFeed();
      const a1 = Obj.make(TestSchema.Person, { name: 'A1' });
      yield* Feed.append(feed, [a1]);
      const b1 = Obj.make(TestSchema.Person, { name: 'B1' });
      const branch = yield* Feed.fork(feed, [b1], { at: a1 });
      expect(Feed.getBranch(b1)).toEqual(branch);

      Obj.update(b1, (b1) => {
        b1.name = 'B1 v2';
      });
      yield* Database.flush();
      return { b1, branch };
    }).pipe(Effect.provide(Database.layer(db)), EffectEx.runAndForwardErrors);

    await peer.reload();
    const db2 = await peer.openLastDatabase();
    await Effect.gen(function* () {
      const [feed] = yield* Database.query(Filter.type(Feed.Feed)).run;
      const reloaded = (yield* queryByName(feed))('B1 v2');
      expect(reloaded.id).toEqual(b1.id);
      expect(Feed.getBranch(reloaded)).toEqual(branch);
      expect(Feed.isFork(reloaded)).toBe(false);
      expect(Feed.getPredecessor(reloaded)).toEqual(branch);
    }).pipe(Effect.provide(Database.layer(db2)), EffectEx.runAndForwardErrors);
  });

  // F-4.1: the base of a fork reads as a root item until the store names its branch, so no live root read may show it.
  test('a live root read never shows the base of a fork', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
    const db = await peer.createDatabase();
    const feed = db.add(Feed.make({ name: 'live' }));
    const a1 = Obj.make(TestSchema.Person, { name: 'A1' });
    await db.appendToFeed(feed, [a1]);

    const query = db.query(
      Query.select(Filter.type(TestSchema.Person)).from(Scope.feed(Feed.getFeedUri(feed)?.toString() ?? '')),
    );
    const seen = new Set<string>();
    const unsubscribe = query.subscribe(() => query.results.forEach((item) => seen.add(item.name ?? '')), {
      fire: true,
    });
    await db.forkFeed(feed, Obj.make(TestSchema.Person, { name: 'B1' }), { at: a1 });
    await db.flush();

    await expect.poll(() => query.results.map((item) => item.name)).toEqual(['A1']);
    expect(seen.has('B1')).toBe(false);
    unsubscribe();
  });

  // D-12: a removal is a write to the object, so its tombstone lands on the branch of the object.
  test('a removed branch item leaves its branch', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
    const db = await peer.createDatabase();

    await Effect.gen(function* () {
      const feed = yield* Database.add(Feed.make({ name: 'removal' }));
      const a1 = Obj.make(TestSchema.Person, { name: 'A1' });
      yield* Feed.append(feed, [a1]);
      const b1 = Obj.make(TestSchema.Person, { name: 'B1' });
      const branch = yield* Feed.fork(feed, [b1], { at: a1 });
      yield* Feed.append(feed, [Obj.make(TestSchema.Person, { name: 'B2' })], { branch });
      yield* Database.flush();

      yield* Feed.remove(feed, [b1]);
      yield* Database.flush();

      const names = (items: readonly TestSchema.Person[]) => items.map((item) => item.name);
      expect(names(yield* Feed.walk(feed, Filter.type(TestSchema.Person), { branch }).run)).toEqual(['A1', 'B2']);
      expect(names(yield* Feed.query(feed, Filter.type(TestSchema.Person)).run)).toEqual(['A1']);
    }).pipe(Effect.provide(Database.layer(db)), EffectEx.runAndForwardErrors);
  });

  // D-12: a client with no live copy of the item still removes it from its own branch, read from the item.
  test('removing a snapshot kept across a reload leaves its branch', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
    const db = await peer.createDatabase();
    const branch = await Effect.gen(function* () {
      const feed = yield* makeFeed();
      const a1 = Obj.make(TestSchema.Person, { name: 'A1' });
      yield* Feed.append(feed, [a1]);
      const branch = yield* Feed.fork(feed, [Obj.make(TestSchema.Person, { name: 'B1' })], { at: a1 });
      yield* Feed.append(feed, [Obj.make(TestSchema.Person, { name: 'B2' })], { branch });
      yield* Database.flush();
      return branch;
    }).pipe(Effect.provide(Database.layer(db)), EffectEx.runAndForwardErrors);

    await peer.reload();
    const db2 = await peer.openLastDatabase();
    const snapshot = await Effect.gen(function* () {
      const [feed] = yield* Database.query(Filter.type(Feed.Feed)).run;
      return Obj.getSnapshot((yield* queryByName(feed))('B1'));
    }).pipe(Effect.provide(Database.layer(db2)), EffectEx.runAndForwardErrors);
    expect(Feed.getBranch(snapshot)).toEqual(branch);

    await peer.reload();
    const db3 = await peer.openLastDatabase();
    await Effect.gen(function* () {
      const [feed] = yield* Database.query(Filter.type(Feed.Feed)).run;
      yield* Feed.remove(feed, [snapshot]);
      yield* Database.flush();
      const names = (items: readonly TestSchema.Person[]) => items.map((item) => item.name);
      expect(names(yield* Feed.walk(feed, Filter.type(TestSchema.Person), { branch }).run)).toEqual(['A1', 'B2']);
    }).pipe(Effect.provide(Database.layer(db3)), EffectEx.runAndForwardErrors);
  });

  // F-4.1: a default read covers one branch, so a branch never reaches a reader that did not ask for it.
  test('a default feed read covers only the root branch, indexed or not', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person], assignQueuePositions: true });
    const db = await peer.createDatabase();

    await Effect.gen(function* () {
      for (const indexed of [true, false]) {
        const feed = yield* Database.add(Feed.make({ name: indexed ? 'indexed' : 'unindexed' }));
        if (!indexed) {
          yield* Feed.setIndexing(feed, { enabled: false });
        }
        const a1 = Obj.make(TestSchema.Person, { name: 'A1' });
        yield* Feed.append(feed, [a1]);
        const branch = yield* Feed.fork(feed, [Obj.make(TestSchema.Person, { name: 'B1' })], { at: a1 });
        yield* Database.flush();

        const names = (items: readonly TestSchema.Person[]) => items.map((item) => item.name).sort();
        expect(names(yield* Feed.query(feed, Filter.type(TestSchema.Person)).run)).toEqual(['A1']);
        expect(names(yield* Feed.query(feed, Filter.type(TestSchema.Person), { branches: [branch] }).run)).toEqual([
          'B1',
        ]);
        expect(names(yield* Feed.query(feed, Filter.type(TestSchema.Person), { branches: 'all' }).run)).toEqual([
          'A1',
          'B1',
        ]);
      }
    }).pipe(Effect.provide(Database.layer(db)), EffectEx.runAndForwardErrors);
  });

  test('re-appending an item on a different branch, or forking from a written item, is rejected', async ({
    expect,
  }) => {
    await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
    const db = await peer.createDatabase();

    await Effect.gen(function* () {
      const feed = yield* makeFeed();
      const a1 = Obj.make(TestSchema.Person, { name: 'A1' });
      yield* Feed.append(feed, [a1]);
      const b1 = Obj.make(TestSchema.Person, { name: 'B1' });
      const branch = yield* Feed.fork(feed, [b1], { at: a1 });

      // A separate object reusing the id of a root item, stated on the branch.
      const moved = Obj.make(TestSchema.Person, { id: a1.id, name: 'A1 moved' });
      const movedExit = yield* Effect.exit(Feed.append(feed, [moved], { branch }));
      expect(rejection(movedExit)).toBeInstanceOf(FeedBranchMismatchError);
      expect(a1.name).toEqual('A1');

      // A written item cannot become the base of a new branch.
      const reforkExit = yield* Effect.exit(Feed.fork(feed, [a1], { at: a1 }));
      expect(rejection(reforkExit)).toBeInstanceOf(FeedBranchMismatchError);

      // The live branch item itself, re-stamped onto the root branch.
      const liveExit = yield* Effect.exit(
        Effect.promise(() => {
          setBranchKey(b1, undefined);
          return db.appendToFeed(feed, [b1]);
        }),
      );
      expect(rejection(liveExit)).toBeInstanceOf(FeedBranchMismatchError);
      expect(Feed.getBranch(b1)).toEqual(branch);

      // A background flush of a local edit of the branch key sends the object's own branch.
      Obj.update(b1, (b1) => {
        b1.name = 'B1 v2';
      });
      setBranchKey(a1, branch);
      yield* Database.flush();
      expect(Feed.getBranch(a1)).toBeUndefined();

      const byName = yield* queryByName(feed);
      expect(Feed.getBranch(byName('A1'))).toBeUndefined();
      expect(Feed.getBranch(byName('B1 v2'))).toEqual(branch);
    }).pipe(Effect.provide(Database.layer(db)), EffectEx.runAndForwardErrors);
  });

  // The walk is a core query; `Feed.walk` wraps it [D-57], [D-58].
  describe('walk', () => {
    // A1 A2 B1(fork at A1) A3 B2: the root branch and one branch of it.
    const setup = Effect.gen(function* () {
      const feed = yield* Database.add(Feed.make({ name: 'walk' }));
      const a1 = Obj.make(TestSchema.Person, { name: 'A1' });
      yield* Feed.append(feed, [a1, Obj.make(TestSchema.Person, { name: 'A2' })]);
      const branch = yield* Feed.fork(feed, [Obj.make(TestSchema.Person, { name: 'B1' })], { at: a1 });
      yield* Feed.append(feed, [Obj.make(TestSchema.Person, { name: 'A3' })]);
      yield* Feed.append(feed, [Obj.make(TestSchema.Person, { name: 'B2' })], { branch });
      yield* Database.flush();
      const feedUri = Feed.getFeedUri(feed)?.toString() ?? '';
      return { feed, feedUri, a1, branch };
    });

    const names = (items: readonly TestSchema.Person[]) => items.map((item) => item.name);

    test('a forward walk pages from the root base to the branch with a local cursor', async ({ expect }) => {
      await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
      const db = await peer.createDatabase();

      await Effect.gen(function* () {
        const { feedUri, branch } = yield* setup;
        const page = (begin: Feed.LocalCursor | undefined) =>
          Database.query(
            Query.select(Filter.and(Filter.type(TestSchema.Person), Filter.feedCursor({ begin, positions: 'local' })))
              .from(Scope.feed(feedUri, { walk: { branch } }))
              .orderBy(Order.natural('asc'))
              .limit(2),
          ).run;

        const first = yield* page(undefined);
        expect(names(first)).toEqual(['A1', 'B1']);
        const cursor = Feed.getLocalCursor(first[1]);
        expect(cursor).toBeDefined();
        expect(names(yield* page(cursor))).toEqual(['B2']);
      }).pipe(Effect.provide(Database.layer(db)), EffectEx.runAndForwardErrors);
    });

    test('a walk gives the fork points it meets, and walks backward to the root base', async ({ expect }) => {
      await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
      const db = await peer.createDatabase();

      await Effect.gen(function* () {
        const { feedUri, branch } = yield* setup;
        const withForks = yield* Database.query(
          Query.select(Filter.type(TestSchema.Person))
            .from(Scope.feed(feedUri, { walk: { forks: true } }))
            .orderBy(Order.natural('asc')),
        ).run;
        expect(names(withForks)).toEqual(['A1', 'B1', 'A2', 'A3']);
        expect(withForks.filter((item) => Feed.isFork(item) && Feed.getBranch(item) !== undefined)).toHaveLength(1);

        const forward = yield* Database.query(
          Query.select(Filter.type(TestSchema.Person))
            .from(Scope.feed(feedUri, { walk: { branch } }))
            .orderBy(Order.natural('asc')),
        ).run;
        const b2 = forward.find((item) => item.name === 'B2');
        const backward = yield* Database.query(
          Query.select(Filter.feedCursor({ begin: b2 && Feed.getLocalCursor(b2), positions: 'local' }))
            .from(Scope.feed(feedUri, { walk: {} }))
            .orderBy(Order.natural('desc')),
        ).run;
        expect(backward.map((item) => (Obj.instanceOf(TestSchema.Person, item) ? item.name : undefined))).toEqual([
          'B1',
          'A1',
        ]);
      }).pipe(Effect.provide(Database.layer(db)), EffectEx.runAndForwardErrors);
    });

    // D-69: each item once, at the place of its first block, with the content of its latest one.
    test('an updated item comes once, at the place of its first block, with its latest content', async ({ expect }) => {
      await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
      const db = await peer.createDatabase();

      await Effect.gen(function* () {
        const { feed, a1 } = yield* setup;
        Obj.update(a1, (a1) => {
          a1.name = 'A1 v2';
        });
        yield* Database.flush();
        const person = Filter.type(TestSchema.Person);
        expect(names(yield* Feed.walk(feed, person).run)).toEqual(['A1 v2', 'A2', 'A3']);
        expect(names(yield* Feed.walk(feed, person, { order: 'desc' }).run)).toEqual(['A3', 'A2', 'A1 v2']);

        // The cursor of the updated item names its latest block, and the next page still starts after its place.
        const [first] = yield* Feed.walk(feed, person, { limit: 1 }).run;
        const rest = yield* Feed.walk(feed, person, { begin: Feed.getLocalCursor(first) }).run;
        expect(names(rest)).toEqual(['A2', 'A3']);
      }).pipe(Effect.provide(Database.layer(db)), EffectEx.runAndForwardErrors);
    });

    test('Feed.walk reads the same as the walk query', async ({ expect }) => {
      await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
      const db = await peer.createDatabase();

      await Effect.gen(function* () {
        const { feed, branch } = yield* setup;
        const first = yield* Feed.walk(feed, Filter.type(TestSchema.Person), { branch, limit: 2 }).run;
        expect(names(first)).toEqual(['A1', 'B1']);
        const rest = yield* Feed.walk(feed, Filter.type(TestSchema.Person), {
          branch,
          begin: Feed.getLocalCursor(first[1]),
        }).run;
        expect(names(rest)).toEqual(['B2']);
        const back = yield* Feed.walk(feed, Filter.type(TestSchema.Person), { branch, order: 'desc' }).run;
        expect(names(back)).toEqual(['B2', 'B1', 'A1']);
      }).pipe(Effect.provide(Database.layer(db)), EffectEx.runAndForwardErrors);
    });
  });
});

/** Sets, or with `undefined` removes, the branch key of a live object, as a careless writer would. */
const setBranchKey = (obj: Obj.Any, branch: string | undefined): void => {
  Obj.update(obj, (obj) => {
    const keys = Obj.getMeta(obj).keys;
    for (let index = keys.length - 1; index >= 0; index--) {
      if (keys[index].source === FeedProtocol.KEY_FEED_BRANCH) {
        keys.splice(index, 1);
      }
    }
    if (branch !== undefined) {
      keys.push({ source: FeedProtocol.KEY_FEED_BRANCH, id: branch });
    }
  });
};

/**
 * A feed read by a scan of its store rather than its index, which holds only the main branch by default; the
 * branch views are computed in memory from every item.
 */
const makeFeed = Effect.fnUntraced(function* () {
  const feed = yield* Database.add(Feed.make({ name: 'branches' }));
  yield* Feed.setIndexing(feed, { enabled: false });
  return feed;
});

/** Reads every person in the feed and returns a lookup by name that fails the test on a miss. */
const queryByName = (feed: Feed.Feed) =>
  Feed.query(feed, Filter.type(TestSchema.Person), { branches: 'all' }).run.pipe(
    Effect.map((results) => (name: string) => {
      const item = results.find((result) => result.name === name);
      if (item === undefined) {
        throw new Error(`No feed item named ${name}.`);
      }
      return item;
    }),
  );

/** The error a rejected append raised; `Feed.append` surfaces a rejected write as a defect. */
const rejection = (exit: Exit.Exit<unknown>): unknown => (Exit.isFailure(exit) ? Cause.squash(exit.cause) : undefined);
