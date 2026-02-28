//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Database, Entity, Feed, Filter, Obj, Type } from '@dxos/echo';
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

  test('query items in a feed', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [Type.Feed, TestSchema.Person] });
    const db = await peer.createDatabase();
    const queues = peer.client.constructQueueFactory(db.spaceId);
    const testLayer = Layer.merge(Database.layer(db), createFeedServiceLayer(queues));

    await Effect.gen(function* () {
      const feed = yield* Database.add(Feed.make({ name: 'queryable' }));

      const alice = Obj.make(TestSchema.Person, { name: 'alice' });
      const bob = Obj.make(TestSchema.Person, { name: 'bob' });
      yield* Feed.append(feed, [alice, bob]);

      const results = yield* Feed.runQuery(feed, Filter.type(TestSchema.Person));
      expect(results).toHaveLength(2);
      expect(results.map((item: any) => item.name).sort()).toEqual(['alice', 'bob']);
    }).pipe(Effect.provide(testLayer), runAndForwardErrors);
  });

  // TODO(wittjosiah): Implement when queue retention is supported.
  test.todo('setRetention configures feed retention policy');
});
