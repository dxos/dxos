//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as SqlClient from 'effect/sql/SqlClient';

import * as SqlService from '@dxos/compute/SqlService';
import { Database, Feed } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { layerMemory } from '@dxos/sql-sqlite/Platform';
import { Reducer, Trajectory } from '@dxos/trajectory';
import { Message } from '@dxos/types';

import * as TrajectoryCache from './TrajectoryCache.ts';
import * as TrajectoryStore from './TrajectoryStore.ts';

const say = (text: string, role: Trajectory.Role = 'assistant') =>
  Trajectory.make({ payload: { _tag: 'message', blocks: [{ _tag: 'text', text }] }, sender: { role } });

const SqlLayer = Layer.provideMerge(SqlService.layerGuarded, layerMemory);
const TestLayer = Layer.merge(TestDatabaseLayer({ types: [Feed.Feed, Message.Message, Trajectory.Event] }), SqlLayer);

const storedCount = (feed: Feed.Feed, reducer: { readonly id: string } = Reducer.prompt) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    const rows = yield* sql<{ count: number }>`
      SELECT count FROM trajectory_checkpoint
      WHERE trajectory = ${TrajectoryCache.trajectoryId(feed)} AND reducer = ${reducer.id}
    `;
    return rows[0]?.count;
  }).pipe(Effect.provide(SqlService.database({ name: 'trajectory-cache' })), Effect.orDie);

describe('TrajectoryCache', () => {
  it.effect('resumes from the stored checkpoint and matches a full fold', () =>
    Effect.gen(function* () {
      const { db } = yield* Database.Service;
      const feed = db.add(Feed.make());
      yield* TrajectoryStore.append(feed, [say('one'), say('two')]);

      const first = yield* TrajectoryCache.load(feed, Reducer.prompt);
      expect(first.count).toBe(2);
      expect(yield* storedCount(feed)).toBe(2);

      // One more event is folded in memory but not yet saved: saves are batched.
      yield* TrajectoryStore.append(feed, [say('three')]);
      const second = yield* TrajectoryCache.load(feed, Reducer.prompt);
      expect(second.count).toBe(3);
      expect(yield* storedCount(feed)).toBe(2);

      const full = Reducer.run(Reducer.prompt, yield* TrajectoryStore.read(feed));
      expect(second.state).toEqual(full.state);

      // A restarted process resumes from the stored checkpoint and folds what came after it.
      TrajectoryCache.forget(db);
      const restarted = yield* TrajectoryCache.load(feed, Reducer.prompt);
      expect(restarted.count).toBe(3);
      expect(restarted.state).toEqual(full.state);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('a checkpoint that no longer decodes is rebuilt from the feed', () =>
    Effect.gen(function* () {
      const { db } = yield* Database.Service;
      const feed = db.add(Feed.make());
      yield* TrajectoryStore.append(feed, [say('one')]);
      yield* TrajectoryCache.load(feed, Reducer.session);

      yield* Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        yield* sql`UPDATE trajectory_checkpoint SET state = 'not json'`;
      }).pipe(Effect.provide(SqlService.database({ name: 'trajectory-cache' })), Effect.orDie);

      yield* TrajectoryStore.append(feed, [say('two', 'user')]);
      TrajectoryCache.forget(db);
      const { state, count } = yield* TrajectoryCache.load(feed, Reducer.session);
      expect(count).toBe(2);
      expect(state.queue).toHaveLength(1);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('saves the checkpoint again once enough events have been folded since the last save', () =>
    Effect.gen(function* () {
      const { db } = yield* Database.Service;
      const feed = db.add(Feed.make());
      yield* TrajectoryStore.append(feed, [say('first')]);
      yield* TrajectoryCache.load(feed, Reducer.thread);
      expect(yield* storedCount(feed, Reducer.thread)).toBe(1);

      yield* TrajectoryStore.append(
        feed,
        Array.from({ length: 64 }, (_, index) => say(`more ${index}`)),
      );
      yield* TrajectoryCache.load(feed, Reducer.thread);
      expect(yield* storedCount(feed, Reducer.thread)).toBe(65);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('without SqlService it folds the whole feed', () =>
    Effect.gen(function* () {
      const { db } = yield* Database.Service;
      const feed = db.add(Feed.make());
      yield* TrajectoryStore.append(feed, [say('one'), say('two')]);
      expect((yield* TrajectoryCache.load(feed, Reducer.thread)).state.items).toHaveLength(2);
    }).pipe(Effect.provide(TestDatabaseLayer({ types: [Feed.Feed, Message.Message, Trajectory.Event] }))),
  );
});
