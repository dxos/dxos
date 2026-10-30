//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { afterAll, bench, describe } from 'vitest';

import { Filter, Obj, Query, Type } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { DXN } from '@dxos/keys';

import { parseBenchCount } from './testing/bench-util.ts';

//
// What an index request costs when there is little or nothing to index. Composer asks for one on every flush, so
// the floor of a pass — finding no new input, then re-running the live queries it would invalidate — is paid far
// more often than a pass that indexes anything.
//
// One peer holds OBJECT_COUNT objects with LIVE_QUERY_COUNT live queries over them. `nothing changed` requests an
// index pass with no write since the last one; `one write` changes one object first, so the pass indexes one
// document and re-runs the queries it touches.
//

const OBJECT_COUNT = parseBenchCount('INDEX_PASS_BENCH_COUNT', 2_000);
const LIVE_QUERY_COUNT = 5;
const PRIORITY_LEVELS = 5;
const BENCH_OPTIONS = { time: 1_000, warmupIterations: 3 };

class PassTask extends Type.makeObject<PassTask>(DXN.make('com.example.type.passTask', '0.1.0'))(
  Schema.Struct({
    title: Schema.optional(Schema.String),
    priority: Schema.optional(Schema.Number),
  }),
) {}

const builder = await new EchoTestBuilder().open();
const { db } = await builder.createDatabase({ types: [PassTask] });
const tasks = Array.from({ length: OBJECT_COUNT }, (unusedValue, index) =>
  db.add(Obj.make(PassTask, { title: `task ${index}`, priority: (index % PRIORITY_LEVELS) + 1 })),
);
await db.flush({ indexes: true });

const live = Array.from({ length: LIVE_QUERY_COUNT }, (unusedValue, index) =>
  db.query(Query.select(Filter.type(PassTask, { priority: Filter.eq(index + 1) }))),
);
const unsubscribes = live.map((result) => result.subscribe());
await Promise.all(live.map((result) => result.run()));

let edits = 0;

afterAll(async () => {
  unsubscribes.forEach((unsubscribe) => unsubscribe());
  await builder.close();
}, 60_000);

describe('index pass', { tags: ['manual'], timeout: 300_000 }, () => {
  bench(
    `index request, nothing changed (${OBJECT_COUNT} objects, ${LIVE_QUERY_COUNT} live queries)`,
    async () => {
      await db.flush({ indexes: true });
    },
    BENCH_OPTIONS,
  );

  bench(
    `index request after one write (${OBJECT_COUNT} objects, ${LIVE_QUERY_COUNT} live queries)`,
    async () => {
      const task = tasks[edits++ % tasks.length];
      Obj.update(task, (task) => {
        task.title = `edited ${edits}`;
      });
      await db.flush({ indexes: true });
    },
    BENCH_OPTIONS,
  );
});
