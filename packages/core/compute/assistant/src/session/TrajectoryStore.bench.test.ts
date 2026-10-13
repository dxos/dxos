//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as SqlClient from 'effect/sql/SqlClient';
import { writeFileSync } from 'node:fs';

import * as SqlService from '@dxos/compute/SqlService';
import { Database, Feed } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { log } from '@dxos/log';
import { layerMemory } from '@dxos/sql-sqlite/Platform';
import { Reducer, Trajectory } from '@dxos/trajectory';
import { Message } from '@dxos/types';

import { SessionStore } from './SessionStore.ts';
import * as TrajectoryCache from './TrajectoryCache.ts';
import * as TrajectoryStore from './TrajectoryStore.ts';

//
// Load cost of conversations of several lengths: `DX_BENCH=1` runs it, since timings are meaningless on a shared CI
// runner. `DX_BENCH_TURNS` lists the sizes (comma-separated turns); `DX_BENCH_OUT` names a JSON file for the results.
//

const SIZES = (process.env.DX_BENCH_TURNS ?? '100,1000,5000').split(',').map(Number);
/** Repeats of each cheap measurement; the median is reported. */
const REPEATS = 5;

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

/** One turn as a chat written before trajectory events holds it: the question and the answer. */
const legacyTurn = (index: number): Message.Message[] => [
  Message.make({ sender: 'user', blocks: [{ _tag: 'text', text: `question ${index}` }] }),
  Message.make({ sender: 'assistant', blocks: [{ _tag: 'text', text: `answer ${index} `.repeat(40) }] }),
];

const timed = Effect.fnUntraced(function* <A, E, R>(
  effect: Effect.Effect<A, E, R>,
): Effect.fn.Return<[A, number], E, R> {
  const start = performance.now();
  const result = yield* effect;
  const measured: [A, number] = [result, Math.round((performance.now() - start) * 10) / 10];
  return measured;
});

/** Median time of `REPEATS` runs of `effect`. */
const median = Effect.fnUntraced(function* <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.fn.Return<number, E, R> {
  const times: number[] = [];
  for (let repeat = 0; repeat < REPEATS; repeat++) {
    const [, ms] = yield* timed(effect);
    times.push(ms);
  }
  return times.sort((left, right) => left - right)[Math.floor(REPEATS / 2)];
});

const foldTime = <S>(events: readonly Trajectory.Event[], reducer: Reducer.Reducer<S>) =>
  median(Effect.sync(() => Reducer.run(reducer, events)));

const clearCache = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  yield* sql`DELETE FROM trajectory_checkpoint`;
}).pipe(Effect.provide(SqlService.database({ name: 'trajectory-cache' })), Effect.orDie);

const checkpointBytes = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  return yield* sql<{ reducer: string; bytes: number }>`
    SELECT reducer, length(state) AS bytes FROM trajectory_checkpoint ORDER BY reducer
  `;
}).pipe(Effect.provide(SqlService.database({ name: 'trajectory-cache' })), Effect.orDie);

/** What a turn reads before it calls the model: the pending queue and alarms, then the history it sends. */
const turnReads = (feed: Feed.Feed) => new SessionStore().loadState(feed);

const results: Record<string, unknown>[] = [];

describe.runIf(process.env.DX_BENCH === '1')('TrajectoryStore load cost', () => {
  for (const turns of SIZES) {
    it.effect(
      `${turns} turns`,
      () =>
        Effect.gen(function* () {
          const { db } = yield* Database.Service;
          // Runs the cache's migrations, so the loads below measure only the read and the fold.
          yield* TrajectoryCache.load(db.add(Feed.make()), Reducer.prompt);

          // Trajectory events, one append per turn.
          const feed = db.add(Feed.make());
          const [, write] = yield* timed(
            Effect.forEach(
              Array.from({ length: turns }, (_, index) => index),
              (index) => TrajectoryStore.append(feed, turnEvents(index)),
            ),
          );
          yield* Database.flush();

          const read = yield* median(TrajectoryStore.read(feed));
          const events = yield* TrajectoryStore.read(feed);
          const fold = {
            prompt: yield* foldTime(events, Reducer.prompt),
            thread: yield* foldTime(events, Reducer.thread),
            session: yield* foldTime(events, Reducer.session),
          };

          yield* clearCache;
          TrajectoryCache.forget(db);
          const [, coldTurn] = yield* timed(turnReads(feed));
          const warmTurn = yield* median(turnReads(feed));
          yield* TrajectoryStore.append(feed, turnEvents(turns));
          const [, nextTurn] = yield* timed(turnReads(feed));
          TrajectoryCache.forget(db);
          const [, reopenTurn] = yield* timed(turnReads(feed));
          const [cold] = yield* timed(TrajectoryCache.load(feed, Reducer.prompt));
          const checkpoints = yield* checkpointBytes;

          // The same conversation as a chat written before trajectory events: converted on every read.
          const legacy = db.add(Feed.make());
          yield* Effect.forEach(
            Array.from({ length: turns }, (_, index) => index),
            (index) => Feed.append(legacy, legacyTurn(index)),
          );
          yield* Database.flush();
          yield* clearCache;
          TrajectoryCache.forget(db);
          const [, legacyColdTurn] = yield* timed(turnReads(legacy));
          const legacyWarmTurn = yield* median(turnReads(legacy));

          const result = {
            turns,
            events: events.length,
            writeTurnMs: Math.round((write / turns) * 100) / 100,
            readMs: read,
            foldMs: fold,
            turnReadsMs: { cold: coldTurn, reopen: reopenTurn, warm: warmTurn, afterOneTurn: nextTurn },
            legacyTurnReadsMs: { cold: legacyColdTurn, warm: legacyWarmTurn },
            checkpointBytes: Object.fromEntries(checkpoints.map(({ reducer, bytes }) => [reducer, bytes])),
          };
          results.push(result);
          log.info('trajectory load cost', result);
          expect(cold.count).toBe(events.length + turnEvents(0).length);
        }).pipe(Effect.provide(TestLayer)),
      30 * 60_000,
    );
  }

  it('writes the results', () => {
    if (process.env.DX_BENCH_OUT) {
      writeFileSync(process.env.DX_BENCH_OUT, JSON.stringify(results, null, 2));
    }
  });
});
