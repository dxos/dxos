//
// Copyright 2025 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Database, Entity, Err, Feed, Filter, Obj, Type } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { runAndForwardErrors } from '@dxos/effect';
import { DXN } from '@dxos/keys';

import { EchoTestBuilder } from '../testing';

import { createFeedServiceLayer } from './feed-service';

describe('Feed', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  describe('next', () => {
    test('returns items directly', async ({ expect }) => {
      await using peer = await builder.createPeer({ types: [Type.Feed, TestSchema.Person] });
      const db = await peer.createDatabase();
      const queues = peer.client.constructQueueFactory(db.spaceId);
      const testLayer = Layer.merge(Database.layer(db), createFeedServiceLayer(queues));

      await Effect.gen(function* () {
        const feed = yield* Database.add(Feed.make({ name: 'people' }));

        yield* Feed.append(feed, [
          Obj.make(TestSchema.Person, { name: 'alice' }),
          Obj.make(TestSchema.Person, { name: 'bob' }),
        ]);

        const feedCursor = yield* Feed.cursor<TestSchema.Person>(feed);
        const first = yield* Feed.next(feedCursor);
        expect(first.name).toBe('alice');

        const second = yield* Feed.next(feedCursor);
        expect(second.name).toBe('bob');
      }).pipe(Effect.provide(testLayer), runAndForwardErrors);
    });

    test('fails with CursorExhaustedError when no more items', async ({ expect }) => {
      await using peer = await builder.createPeer({ types: [Type.Feed, TestSchema.Person] });
      const db = await peer.createDatabase();
      const queues = peer.client.constructQueueFactory(db.spaceId);
      const testLayer = Layer.merge(Database.layer(db), createFeedServiceLayer(queues));

      await Effect.gen(function* () {
        const feed = yield* Database.add(Feed.make({ name: 'exhausted' }));

        yield* Feed.append(feed, [Obj.make(TestSchema.Person, { name: 'alice' })]);

        const feedCursor = yield* Feed.cursor<TestSchema.Person>(feed);
        // Consume the only item.
        yield* Feed.next(feedCursor);

        // Next call should fail.
        const exit = yield* Feed.next(feedCursor).pipe(Effect.exit);
        expect(Exit.isFailure(exit)).toBe(true);
        const error = Exit.isFailure(exit) ? Option.getOrUndefined(Cause.failureOption(exit.cause)) : undefined;
        expect(error).toBeInstanceOf(Err.CursorExhaustedError);
      }).pipe(Effect.provide(testLayer), runAndForwardErrors);
    });

    test('fails immediately on empty feed', async ({ expect }) => {
      await using peer = await builder.createPeer({ types: [Type.Feed] });
      const db = await peer.createDatabase();
      const queues = peer.client.constructQueueFactory(db.spaceId);
      const testLayer = Layer.merge(Database.layer(db), createFeedServiceLayer(queues));

      await Effect.gen(function* () {
        const feed = yield* Database.add(Feed.make({ name: 'empty' }));

        const feedCursor = yield* Feed.cursor(feed);
        const exit = yield* Feed.next(feedCursor).pipe(Effect.exit);
        expect(Exit.isFailure(exit)).toBe(true);
      }).pipe(Effect.provide(testLayer), runAndForwardErrors);
    });

    test('error can be caught with catchTag', async ({ expect }) => {
      await using peer = await builder.createPeer({ types: [Type.Feed] });
      const db = await peer.createDatabase();
      const queues = peer.client.constructQueueFactory(db.spaceId);
      const testLayer = Layer.merge(Database.layer(db), createFeedServiceLayer(queues));

      await Effect.gen(function* () {
        const feed = yield* Database.add(Feed.make({ name: 'catchable' }));

        const feedCursor = yield* Feed.cursor(feed);
        const result = yield* Feed.next(feedCursor).pipe(
          Effect.map(() => 'got-item' as const),
          Effect.catchTag('CursorExhaustedError', () => Effect.succeed('exhausted' as const)),
        );
        expect(result).toBe('exhausted');
      }).pipe(Effect.provide(testLayer), runAndForwardErrors);
    });
  });

  describe('nextOption', () => {
    test('returns Some for available items', async ({ expect }) => {
      await using peer = await builder.createPeer({ types: [Type.Feed, TestSchema.Person] });
      const db = await peer.createDatabase();
      const queues = peer.client.constructQueueFactory(db.spaceId);
      const testLayer = Layer.merge(Database.layer(db), createFeedServiceLayer(queues));

      await Effect.gen(function* () {
        const feed = yield* Database.add(Feed.make({ name: 'people' }));

        yield* Feed.append(feed, [
          Obj.make(TestSchema.Person, { name: 'alice' }),
          Obj.make(TestSchema.Person, { name: 'bob' }),
        ]);

        const feedCursor = yield* Feed.cursor<TestSchema.Person>(feed);
        const first = yield* Feed.nextOption(feedCursor);
        expect(Option.isSome(first)).toBe(true);
        expect(Option.getOrThrow(first).name).toBe('alice');

        const second = yield* Feed.nextOption(feedCursor);
        expect(Option.isSome(second)).toBe(true);
        expect(Option.getOrThrow(second).name).toBe('bob');
      }).pipe(Effect.provide(testLayer), runAndForwardErrors);
    });

    test('returns None when cursor is exhausted', async ({ expect }) => {
      await using peer = await builder.createPeer({ types: [Type.Feed, TestSchema.Person] });
      const db = await peer.createDatabase();
      const queues = peer.client.constructQueueFactory(db.spaceId);
      const testLayer = Layer.merge(Database.layer(db), createFeedServiceLayer(queues));

      await Effect.gen(function* () {
        const feed = yield* Database.add(Feed.make({ name: 'exhausted' }));

        yield* Feed.append(feed, [Obj.make(TestSchema.Person, { name: 'alice' })]);

        const feedCursor = yield* Feed.cursor<TestSchema.Person>(feed);
        yield* Feed.nextOption(feedCursor); // consume the item

        const result = yield* Feed.nextOption(feedCursor);
        expect(Option.isNone(result)).toBe(true);
      }).pipe(Effect.provide(testLayer), runAndForwardErrors);
    });

    test('returns None on empty feed', async ({ expect }) => {
      await using peer = await builder.createPeer({ types: [Type.Feed] });
      const db = await peer.createDatabase();
      const queues = peer.client.constructQueueFactory(db.spaceId);
      const testLayer = Layer.merge(Database.layer(db), createFeedServiceLayer(queues));

      await Effect.gen(function* () {
        const feed = yield* Database.add(Feed.make({ name: 'empty' }));

        const feedCursor = yield* Feed.cursor(feed);
        const result = yield* Feed.nextOption(feedCursor);
        expect(Option.isNone(result)).toBe(true);
      }).pipe(Effect.provide(testLayer), runAndForwardErrors);
    });
  });

  test('remove items from a feed', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [Type.Feed, TestSchema.Person] });
    const db = await peer.createDatabase();
    const queues = peer.client.constructQueueFactory(db.spaceId);
    const testLayer = Layer.merge(Database.layer(db), createFeedServiceLayer(queues));

    await Effect.gen(function* () {
      const feed = yield* Database.add(Feed.make({ name: 'removable' }));

      const alice = Obj.make(TestSchema.Person, { name: 'alice' });
      const bob = Obj.make(TestSchema.Person, { name: 'bob' });
      yield* Feed.append(feed, [alice, bob]);

      yield* Feed.remove(feed, [alice]);

      const feedCursor = yield* Feed.cursor<TestSchema.Person>(feed);
      const first = yield* Feed.next(feedCursor);
      expect(first.name).toBe('bob');

      const exit = yield* Feed.next(feedCursor).pipe(Effect.exit);
      expect(Exit.isFailure(exit)).toBe(true);
    }).pipe(Effect.provide(testLayer), runAndForwardErrors);
  });

  test('multiple feeds are independent', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [Type.Feed, TestSchema.Person] });
    const db = await peer.createDatabase();
    const queues = peer.client.constructQueueFactory(db.spaceId);
    const testLayer = Layer.merge(Database.layer(db), createFeedServiceLayer(queues));

    await Effect.gen(function* () {
      const feedA = yield* Database.add(Feed.make({ name: 'feed-a' }));
      const feedB = yield* Database.add(Feed.make({ name: 'feed-b' }));

      yield* Feed.append(feedA, [Obj.make(TestSchema.Person, { name: 'alice' })]);
      yield* Feed.append(feedB, [Obj.make(TestSchema.Person, { name: 'bob' })]);

      const cursorA = yield* Feed.cursor<TestSchema.Person>(feedA);
      const itemA = yield* Feed.next(cursorA);
      expect(itemA.name).toBe('alice');

      const cursorB = yield* Feed.cursor<TestSchema.Person>(feedB);
      const itemB = yield* Feed.next(cursorB);
      expect(itemB.name).toBe('bob');

      // Verify no cross-contamination.
      expect(Exit.isFailure(yield* Feed.next(cursorA).pipe(Effect.exit))).toBe(true);
      expect(Exit.isFailure(yield* Feed.next(cursorB).pipe(Effect.exit))).toBe(true);
    }).pipe(Effect.provide(testLayer), runAndForwardErrors);
  });

  test('DXN is stored as meta key on feed object', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [Type.Feed, TestSchema.Person] });
    const db = await peer.createDatabase();
    const queues = peer.client.constructQueueFactory(db.spaceId);
    const testLayer = Layer.merge(Database.layer(db), createFeedServiceLayer(queues));

    await Effect.gen(function* () {
      const feed = yield* Database.add(Feed.make({ name: 'meta-test' }));

      // Before any operation, no key.
      const keysBefore = Entity.getKeys(feed, Feed.DXN_KEY);
      expect(keysBefore).toHaveLength(0);

      yield* Feed.append(feed, [Obj.make(TestSchema.Person, { name: 'alice' })]);

      // After append, key is set.
      const keysAfter = Entity.getKeys(feed, Feed.DXN_KEY);
      expect(keysAfter).toHaveLength(1);
      expect(keysAfter[0].id).toBeDefined();

      // Verify it's a valid DXN.
      const dxn = DXN.parse(keysAfter[0].id);
      expect(dxn).toBeInstanceOf(DXN);
    }).pipe(Effect.provide(testLayer), runAndForwardErrors);
  });

  test('query feeds by kind', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [Type.Feed] });
    const db = await peer.createDatabase();
    const testLayer = Database.layer(db);

    await Effect.gen(function* () {
      yield* Database.add(Feed.make({ name: 'notifications', kind: 'dxos.org/plugin/notifications/v1' }));
      yield* Database.add(Feed.make({ name: 'messages', kind: 'dxos.org/plugin/messages/v1' }));
      yield* Database.add(Feed.make({ name: 'other-notifications', kind: 'dxos.org/plugin/notifications/v1' }));

      yield* Database.flush({ indexes: true });

      const notificationFeeds = yield* Database.runQuery(
        Filter.type(Type.Feed, { kind: 'dxos.org/plugin/notifications/v1' }),
      );
      expect(notificationFeeds).toHaveLength(2);
      expect(notificationFeeds.map((feed) => feed.name).sort()).toEqual(['notifications', 'other-notifications']);
    }).pipe(Effect.provide(testLayer), runAndForwardErrors);
  });

  // TODO(feed): Implement when queue retention is supported.
  test.todo('setRetention configures feed retention policy');
});
