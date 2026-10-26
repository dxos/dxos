//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as SqlClient from 'effect/sql/SqlClient';

import { EntityId, SpaceId } from '@dxos/keys';

import { FeedOptionsIntentStore } from './feed-options-intent-store.ts';
import { type FeedOptionsIntent } from './indexer-intent.ts';
import { TestSqliteLayer as TestLayer } from './testing/index.ts';

const makeIntent = (spaceId: SpaceId, feedId: string, options: FeedOptionsIntent['options']): FeedOptionsIntent => ({
  kind: 'feed-options',
  spaceId,
  feedId,
  namespace: 'data',
  options,
});

describe('FeedOptionsIntentStore', () => {
  const setup = Effect.gen(function* () {
    const store = new FeedOptionsIntentStore(yield* SqlClient.SqlClient);
    yield* store.migrate();
    return store;
  });

  it.effect(
    'take returns only the newest intent per feed, and the highest id it read',
    Effect.fnUntraced(function* () {
      const store = yield* setup;
      const spaceId = SpaceId.random();
      const feedA = EntityId.random();
      const feedB = EntityId.random();
      yield* store.record([makeIntent(spaceId, feedA, { retention: { maxLength: 10 } })]);
      yield* store.record([makeIntent(spaceId, feedB, { indexing: { enabled: false } })]);
      yield* store.record([makeIntent(spaceId, feedA, { retention: { maxLength: 5 } })]);

      const { maxId, intents } = yield* store.take();
      expect(maxId).toBe(3);
      expect(intents).toEqual([
        makeIntent(spaceId, feedB, { indexing: { enabled: false } }),
        makeIntent(spaceId, feedA, { retention: { maxLength: 5 } }),
      ]);
    }, Effect.provide(TestLayer)),
  );

  // T-2: the newer options must not be erased by the clear that follows applying the older ones.
  it.effect(
    'an intent recorded while the host applies an earlier one survives clear up to the earlier id',
    Effect.fnUntraced(function* () {
      const store = yield* setup;
      const spaceId = SpaceId.random();
      const feedId = EntityId.random();
      yield* store.record([makeIntent(spaceId, feedId, { retention: { maxLength: 10 } })]);
      const taken = yield* store.take();

      yield* store.record([makeIntent(spaceId, feedId, { retention: { maxLength: 2 } })]);
      yield* store.clear(spaceId, feedId, taken.maxId);

      const { intents } = yield* store.take();
      expect(intents).toEqual([makeIntent(spaceId, feedId, { retention: { maxLength: 2 } })]);
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'recording a feed again replaces its pending row',
    Effect.fnUntraced(function* () {
      const store = yield* setup;
      const sql = yield* SqlClient.SqlClient;
      const spaceId = SpaceId.random();
      const feedId = EntityId.random();
      for (const maxLength of [10, 5, 2]) {
        yield* store.record([makeIntent(spaceId, feedId, { retention: { maxLength } })]);
      }

      const rows = yield* sql<{ count: number }>`SELECT COUNT(*) AS count FROM feedOptionsIntents`;
      expect(rows[0]?.count).toBe(1);
      const { maxId, intents } = yield* store.take();
      expect(maxId).toBe(3);
      expect(intents).toEqual([makeIntent(spaceId, feedId, { retention: { maxLength: 2 } })]);
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'clear removes only the named feed',
    Effect.fnUntraced(function* () {
      const store = yield* setup;
      const spaceId = SpaceId.random();
      const feedA = EntityId.random();
      const feedB = EntityId.random();
      yield* store.record([makeIntent(spaceId, feedA, {}), makeIntent(spaceId, feedB, {})]);
      const { maxId } = yield* store.take();
      yield* store.clear(spaceId, feedA, maxId);

      const { intents } = yield* store.take();
      expect(intents.map((intent) => intent.feedId)).toEqual([feedB]);
    }, Effect.provide(TestLayer)),
  );
});
