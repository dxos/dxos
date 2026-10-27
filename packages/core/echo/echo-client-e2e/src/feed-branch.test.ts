//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Database, Feed, Filter, Obj } from '@dxos/echo';
import { FeedBranchMismatchError } from '@dxos/echo-client';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { TestSchema } from '@dxos/echo/testing';
import * as EffectEx from '@dxos/effect/EffectEx';

describe('feed branches', () => {
  let builder: EchoTestBuilder;
  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });
  afterEach(async () => {
    await builder.close();
  });

  // Branch membership rides in item `@meta`, so it has to survive encode → append → query.
  test('branch and fork keys round-trip through a feed', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person], assignQueuePositions: true });
    const db = await peer.createDatabase();

    await Effect.gen(function* () {
      const feed = yield* makeFeed();
      const a1 = Obj.make(TestSchema.Person, { name: 'A1' });
      const a2 = Obj.make(TestSchema.Person, { name: 'A2' });
      yield* Feed.append(feed, [a1, a2]);

      const b1 = Obj.make(TestSchema.Person, { name: 'B1' });
      yield* Feed.append(feed, [b1], { fork: a2 });
      const b2 = Obj.make(TestSchema.Person, { name: 'B2' });
      yield* Feed.append(feed, [b2], { branch: b1.id });
      yield* Database.flush();

      const byName = yield* queryByName(feed);
      expect(Feed.isMain(byName('A1'))).toBe(true);
      expect(Feed.getBranch(byName('A2'))).toBeUndefined();
      expect(Feed.getBranch(byName('B1'))).toEqual(b1.id);
      expect(Feed.getForkPoint(byName('B1'))).toEqual(a2.id);
      expect(Feed.getBranch(byName('B2'))).toEqual(b1.id);
      expect(Feed.getForkPoint(byName('B2'))).toBeUndefined();
    }).pipe(Effect.provide(Database.layer(db)), EffectEx.runAndForwardErrors);
  });

  test('readBranch over queried items returns the main and branch views', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person], assignQueuePositions: true });
    const db = await peer.createDatabase();

    await Effect.gen(function* () {
      const feed = yield* makeFeed();
      const a2 = Obj.make(TestSchema.Person, { name: 'A2' });
      yield* Feed.append(feed, [Obj.make(TestSchema.Person, { name: 'A1' }), a2]);
      yield* Feed.append(feed, [Obj.make(TestSchema.Person, { name: 'A3' })]);
      const b1 = Obj.make(TestSchema.Person, { name: 'B1' });
      yield* Feed.append(feed, [b1], { fork: a2 });
      yield* Feed.append(feed, [Obj.make(TestSchema.Person, { name: 'A4' })]);
      yield* Feed.append(feed, [Obj.make(TestSchema.Person, { name: 'B2' })], { branch: b1.id });
      yield* Database.flush();

      const results = yield* Feed.query(feed, Filter.type(TestSchema.Person)).run;
      expect(results.every((item) => Number.isFinite(Feed.getPosition(item)))).toBe(true);
      const inAppendOrder = [...results].sort((left, right) => Feed.getPosition(left) - Feed.getPosition(right));

      const main = Feed.readBranch(inAppendOrder);
      expect(main.items.map((item) => item.name)).toEqual(['A1', 'A2', 'A3', 'A4']);
      expect(main.shallow).toBe(false);

      const branch = Feed.readBranch(inAppendOrder, b1.id);
      expect(branch.items.map((item) => item.name)).toEqual(['A1', 'A2', 'B1', 'B2']);
      expect(branch.shallow).toBe(false);
    }).pipe(Effect.provide(Database.layer(db)), EffectEx.runAndForwardErrors);
  });

  test('an Obj.update of a branch item keeps its branch across a reload', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
    const db = await peer.createDatabase();

    const { a1, b1 } = await Effect.gen(function* () {
      const feed = yield* makeFeed();
      const a1 = Obj.make(TestSchema.Person, { name: 'A1' });
      yield* Feed.append(feed, [a1]);
      const b1 = Obj.make(TestSchema.Person, { name: 'B1' });
      yield* Feed.append(feed, [b1], { fork: a1 });

      Obj.update(b1, (b1) => {
        b1.name = 'B1 v2';
      });
      expect(Feed.getBranch(b1)).toEqual(b1.id);
      yield* Database.flush();
      return { a1, b1 };
    }).pipe(Effect.provide(Database.layer(db)), EffectEx.runAndForwardErrors);

    await peer.reload();
    const db2 = await peer.openLastDatabase();
    await Effect.gen(function* () {
      const [feed] = yield* Database.query(Filter.type(Feed.Feed)).run;
      const byName = yield* queryByName(feed);
      const reloaded = byName('B1 v2');
      expect(reloaded.id).toEqual(b1.id);
      expect(Feed.getBranch(reloaded)).toEqual(b1.id);
      expect(Feed.getForkPoint(reloaded)).toEqual(a1.id);
    }).pipe(Effect.provide(Database.layer(db2)), EffectEx.runAndForwardErrors);
  });

  test('re-appending an item on a different branch is rejected', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Person] });
    const db = await peer.createDatabase();

    await Effect.gen(function* () {
      const feed = yield* makeFeed();
      const a1 = Obj.make(TestSchema.Person, { name: 'A1' });
      yield* Feed.append(feed, [a1]);
      const b1 = Obj.make(TestSchema.Person, { name: 'B1' });
      yield* Feed.append(feed, [b1], { fork: a1 });

      // A separate object reusing the id of a main-branch item, stated on the branch.
      const moved = Obj.make(TestSchema.Person, { id: a1.id, name: 'A1 moved' });
      const movedExit = yield* Effect.exit(Feed.append(feed, [moved], { branch: b1.id }));
      expect(rejection(movedExit)).toBeInstanceOf(FeedBranchMismatchError);
      expect(a1.name).toEqual('A1');

      // The live branch item itself, re-stamped onto main.
      const liveExit = yield* Effect.exit(
        Effect.promise(() => {
          Feed.setBranch(b1, undefined);
          return db.appendToFeed(feed, [b1]);
        }),
      );
      expect(rejection(liveExit)).toBeInstanceOf(FeedBranchMismatchError);
      expect(Feed.getBranch(b1)).toEqual(b1.id);
      expect(Feed.getForkPoint(b1)).toEqual(a1.id);

      // A background flush of a local edit of the branch keys sends the object's own branch.
      Obj.update(b1, (b1) => {
        b1.name = 'B1 v2';
      });
      Feed.setBranch(a1, b1.id);
      yield* Database.flush();
      expect(Feed.isMain(a1)).toBe(true);

      const byName = yield* queryByName(feed);
      expect(Feed.isMain(byName('A1'))).toBe(true);
      expect(Feed.getBranch(byName('B1 v2'))).toEqual(b1.id);
    }).pipe(Effect.provide(Database.layer(db)), EffectEx.runAndForwardErrors);
  });
});

/**
 * A feed read by a scan of its store rather than its index, which holds only the main branch by default; the
 * branch views are computed in memory from every item.
 */
const makeFeed = () =>
  Effect.gen(function* () {
    const feed = yield* Database.add(Feed.make({ name: 'branches' }));
    yield* Feed.setIndexing(feed, { enabled: false });
    return feed;
  });

/** Reads every person in the feed and returns a lookup by name that fails the test on a miss. */
const queryByName = (feed: Feed.Feed) =>
  Feed.query(feed, Filter.type(TestSchema.Person)).run.pipe(
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
