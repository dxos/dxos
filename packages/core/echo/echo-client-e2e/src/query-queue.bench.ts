//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { afterAll, bench, describe } from 'vitest';

import { asyncTimeout, sleep } from '@dxos/async';
import { Filter, Obj, Query, type QueryResult, Type } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { TestSchema } from '@dxos/echo/testing';
import { DXN } from '@dxos/keys';

import { parseBenchCount } from './testing/bench-util.ts';

//
// How long a cheap live query waits for the index behind heavy ones after a write. The host re-runs every live query
// a write invalidates in one batch, so a cheap query's index answer is only as fast as the batch lets it be: the rows
// time a write until the cheap query's index source answers again, and until every query's has.
//
// One peer holds TASK_COUNT tasks and a few organizations, with HEAVY_COUNT live queries that each read the
// organizations and a fifth of the tasks, and one cheap query that reads the organizations alone. Each iteration adds
// an organization, which invalidates all of them. A second database of the same size holds only the cheap query, so
// `alone` is the same round trip with nothing to queue behind. The local working set shows the write at once, so the rows wait on
// the index source's answer count rather than on the results. Both include the save and the index pass that precede
// the re-runs; `every answer` also includes the debounce window the host gives a query in proportion to what its last
// run cost, so it is the latency a heavy view sees, not only the time spent running.
//

const TASK_COUNT = parseBenchCount('QUERY_QUEUE_BENCH_COUNT', 2_000);
const HEAVY_COUNT = parseBenchCount('QUERY_QUEUE_BENCH_HEAVY', 8);
const ORG_COUNT = 5;
const PRIORITY_LEVELS = 5;
const ANSWER_TIMEOUT_MS = 30_000;
/** How often a row checks for answers; it bounds the rows' resolution. */
const ANSWER_POLL_MS = 1;
const BENCH_OPTIONS = { iterations: 20, time: 0, warmupIterations: 2, warmupTime: 0 };

class QueueTask extends Type.makeObject<QueueTask>(DXN.make('com.example.type.queueTask', '0.1.0'))(
  Schema.Struct({
    title: Schema.optional(Schema.String),
    priority: Schema.optional(Schema.Number),
  }),
) {}

const builder = await new EchoTestBuilder().open();

const seed = async () => {
  const { db } = await builder.createDatabase({ types: [QueueTask, TestSchema.Organization] });
  for (let index = 0; index < TASK_COUNT; index++) {
    db.add(Obj.make(QueueTask, { title: `task ${index}`, priority: (index % PRIORITY_LEVELS) + 1 }));
  }
  for (let index = 0; index < ORG_COUNT; index++) {
    db.add(Obj.make(TestSchema.Organization, { name: `org ${index}` }));
  }
  await db.flush({ indexes: true });
  return db;
};

const db = await seed();
const aloneDb = await seed();

const cheap = db.query(Query.select(Filter.type(TestSchema.Organization)));
const alone = aloneDb.query(Query.select(Filter.type(TestSchema.Organization)));
const heavy = Array.from({ length: HEAVY_COUNT }, (unusedValue, index) =>
  db.query(
    Query.all(
      Query.select(Filter.type(TestSchema.Organization)),
      Query.select(Filter.type(QueueTask, { priority: Filter.eq((index % PRIORITY_LEVELS) + 1) })),
    ),
  ),
);
const all = [cheap, ...heavy];
const unsubscribes = [alone, ...all].map((result) => result.subscribe());

const indexAnswers = (result: QueryResult.QueryResult<Obj.Unknown>): number =>
  result.sources.find((state) => state.source === 'index')?.answers ?? 0;

/** Resolves once each result's index source has answered more often than `before` recorded. */
const waitForAnswers = (results: QueryResult.QueryResult<Obj.Unknown>[], before: number[]): Promise<void> => {
  const deadline = performance.now() + ANSWER_TIMEOUT_MS;
  return asyncTimeout(
    (async () => {
      // Polled: a re-run that leaves the merged result unchanged emits no event. The deadline stops the loop once the
      // timeout has rejected, so a stalled answer does not keep the process alive.
      while (results.some((result, index) => indexAnswers(result) <= before[index]) && performance.now() < deadline) {
        await sleep(ANSWER_POLL_MS);
      }
    })(),
    ANSWER_TIMEOUT_MS,
  );
};

// `every answer` runs before `behind`, whose iterations wait only for the cheap query: run after it, heavy answers left
// over from those writes would count toward the next row's baseline.
// Every live query has its first index answer before the first row writes, so a row times re-runs.
await waitForAnswers(
  [alone, ...all],
  [alone, ...all].map(() => 0),
);

let written = 0;
const write = (target: typeof db): void => {
  target.add(Obj.make(TestSchema.Organization, { name: `written ${written++}` }));
};

afterAll(async () => {
  unsubscribes.forEach((unsubscribe) => unsubscribe());
  await builder.close();
}, 60_000);

describe('query queue', { tags: ['manual'], timeout: 300_000 }, () => {
  bench(
    `write → cheap index answer (alone, ${TASK_COUNT} tasks)`,
    async () => {
      const before = [indexAnswers(alone)];
      write(aloneDb);
      await waitForAnswers([alone], before);
    },
    BENCH_OPTIONS,
  );

  bench(
    `write → every index answer (${HEAVY_COUNT} heavy + 1 cheap, ${TASK_COUNT} tasks)`,
    async () => {
      const before = all.map(indexAnswers);
      write(db);
      await waitForAnswers(all, before);
    },
    BENCH_OPTIONS,
  );

  bench(
    `write → cheap index answer (behind ${HEAVY_COUNT} heavy, ${TASK_COUNT} tasks)`,
    async () => {
      const before = [indexAnswers(cheap)];
      write(db);
      await waitForAnswers([cheap], before);
    },
    BENCH_OPTIONS,
  );
});
