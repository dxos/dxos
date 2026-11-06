//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { vi } from 'vitest';

import * as Reducer from '@dxos/compute/Reducer';
import * as SqlService from '@dxos/compute/SqlService';
import * as Trajectory from '@dxos/compute/Trajectory';
import { Database, Feed } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { layerMemory } from '@dxos/sql-sqlite/Platform';
import { Message } from '@dxos/types';

import { lastItem } from './trajectory-items.ts';
import * as TrajectoryCache from './TrajectoryCache.ts';
import * as TrajectoryStore from './TrajectoryStore.ts';

vi.mock('./trajectory-items.ts', async (importOriginal) => {
  const original = await importOriginal<typeof import('./trajectory-items.ts')>();
  return { ...original, lastItem: vi.fn(original.lastItem) };
});

const say = (text: string) =>
  Trajectory.make({ payload: { _tag: 'message', blocks: [{ _tag: 'text', text }] }, sender: { role: 'assistant' } });

const SqlLayer = Layer.provideMerge(SqlService.layerGuarded, layerMemory);
const TestLayer = Layer.merge(TestDatabaseLayer({ types: [Feed.Feed, Message.Message, Trajectory.Event] }), SqlLayer);

describe('TrajectoryCache walks', () => {
  it.effect('a checkpoint at the end of a walk this process made resumes without checking the feed head', () =>
    Effect.gen(function* () {
      const { db } = yield* Database.Service;
      const feed = db.add(Feed.make());
      yield* TrajectoryStore.append(feed, [say('one'), say('two')]);
      yield* TrajectoryCache.load(feed, Reducer.session);
      yield* TrajectoryCache.load(feed, Reducer.thread);

      vi.mocked(lastItem).mockClear();
      expect((yield* TrajectoryCache.load(feed, Reducer.session)).count).toBe(2);
      expect((yield* TrajectoryCache.load(feed, Reducer.thread)).count).toBe(2);
      expect(lastItem).not.toHaveBeenCalled();

      // A restarted process holds no walk of its own, so a stored checkpoint's cursor is still checked.
      TrajectoryCache.forget(db);
      expect((yield* TrajectoryCache.load(feed, Reducer.session)).count).toBe(2);
      expect(lastItem).toHaveBeenCalledTimes(1);
    }).pipe(Effect.provide(TestLayer)),
  );
});
