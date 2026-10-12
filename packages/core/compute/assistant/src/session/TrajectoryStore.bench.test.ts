//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import * as SqlService from '@dxos/compute/SqlService';
import { Database, Feed } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { log } from '@dxos/log';
import { layerMemory } from '@dxos/sql-sqlite/Platform';
import { Durable, Reducer, Trajectory } from '@dxos/trajectory';
import { Message } from '@dxos/types';

import * as TrajectoryCache from './TrajectoryCache.ts';
import * as TrajectoryStore from './TrajectoryStore.ts';

//
// Load cost of a long conversation: `DX_BENCH=1` runs it, since timings are meaningless on a shared CI runner.
//

const TURNS = Number(process.env.DX_BENCH_TURNS ?? 1_000);

const SqlLayer = Layer.provideMerge(SqlService.layerGuarded, layerMemory);
const TestLayer = Layer.merge(TestDatabaseLayer({ types: [Feed.Feed, ...TrajectoryStore.types] }), SqlLayer);

/** One turn as a turn producer writes it, in a single append. */
const turnEvents = (index: number): Trajectory.Event[] => {
  const begin = Trajectory.make({ payload: { _tag: 'turnBegin' }, sender: { role: 'assistant' } });
  const prompt = Message.make({ sender: 'user', blocks: [{ _tag: 'text', text: `question ${index}` }] });
  return [
    begin,
    ...TrajectoryStore.promptEvents(prompt, begin.id),
    Trajectory.make({
      payload: { _tag: 'message', blocks: [{ _tag: 'text', text: `answer ${index} `.repeat(40) }] },
      sender: { role: 'assistant' },
      thread: begin.id,
    }),
    Trajectory.make({
      payload: { _tag: 'turnEnd', begin: begin.id, finishReason: 'stop' },
      sender: { role: 'assistant' },
    }),
  ];
};

const timed = Effect.fnUntraced(function* <A, E, R>(
  effect: Effect.Effect<A, E, R>,
): Effect.fn.Return<[A, number], E, R> {
  const start = performance.now();
  const result = yield* effect;
  return [result, Math.round(performance.now() - start)] as [A, number];
});

describe.runIf(process.env.DX_BENCH === '1')('TrajectoryStore load cost', () => {
  it.effect(
    `${TURNS} turns`,
    () =>
      Effect.gen(function* () {
        const { db } = yield* Database.Service;
        // Runs the cache's migrations, so the cold load below measures only the fold.
        yield* TrajectoryCache.load(db.add(Feed.make()), Durable.prompt);
        const feed = db.add(Feed.make());
        const [, write] = yield* timed(
          Effect.forEach(
            Array.from({ length: TURNS }, (_, index) => index),
            (index) => TrajectoryStore.append(feed, turnEvents(index)),
          ),
        );
        yield* Database.flush();

        const [events, read] = yield* timed(TrajectoryStore.read(feed));
        const [, fold] = yield* timed(Effect.sync(() => Reducer.run(Reducer.prompt, events)));
        const [cold, coldLoad] = yield* timed(TrajectoryCache.load(feed, Durable.prompt));
        const [, warmLoad] = yield* timed(TrajectoryCache.load(feed, Durable.prompt));
        yield* TrajectoryStore.append(feed, turnEvents(TURNS));
        const [next, nextLoad] = yield* timed(TrajectoryCache.load(feed, Durable.prompt));

        log.info('trajectory load cost', {
          turns: TURNS,
          events: events.length,
          writeMs: write,
          readMs: read,
          foldMs: fold,
          coldLoadMs: coldLoad,
          warmLoadMs: warmLoad,
          nextTurnLoadMs: nextLoad,
        });
        expect(cold.count).toBe(events.length);
        expect(next.count).toBe(events.length + turnEvents(0).length);
      }).pipe(Effect.provide(TestLayer)),
    10 * 60_000,
  );
});
