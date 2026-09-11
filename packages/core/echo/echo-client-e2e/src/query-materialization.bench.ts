//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { rmSync } from 'node:fs';
import { afterAll, bench, describe } from 'vitest';

import { Filter, Obj, Query, Type } from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-client';
import { EchoTestBuilder, type EchoTestPeer, createTmpPath } from '@dxos/echo-client/testing';
import { DXN } from '@dxos/keys';

import { blackhole } from './testing/bench-util.ts';

//
// What it costs to bring a database's objects back into memory: a peer is reloaded from storage before
// every cold row, then a query returns all of the block's objects, then (in the second cold row) one
// field of each result is read. The rows nest, so each phase is a difference of neighbours:
//
//   reload + open                     the cost of standing the peer and database up again
//   + query                           loading the documents and constructing the result objects
//                                     (re-run while short — see `query` — so a sample is the time to a
//                                     full result set)
//   + read one field per result       the first read of each object, where the object's data is materialized
//
// The warm rows run the same query against a peer that already holds every object, so the difference
// between a cold and a warm query is the load itself. Property-access costs are the other file's
// business; this one exists to price materialization, which `property-access.bench.ts` never sees
// because its pools are built once and read forever.
//
// Rows are inclusive of the reload on purpose: vitest constructs tinybench tasks without per-iteration
// hooks, so nothing can run between samples outside the timed body. Every cold row also records its
// own phase timings and reports them from `afterAll`, as a cross-check on the derivation.
//

const OBJECT_COUNT = 1_000;
const WIDE_FIELD_COUNT = 250;
// A cold query over 1,000 wide objects does not complete: each document load runs past the index
// source's 2 s per-object budget and the whole query past its 20 s ceiling, and 200 still reached the
// ceiling once cold loads had slowed over repeated reloads (BENCHMARKS.md records both runs). 100 keeps
// the wide rows inside both, so they measure the load rather than the timeouts.
const WIDE_OBJECT_COUNT = 100;
// Every cold sample reloads a peer and reloads the documents, seconds each, and cold loads slow down over
// repeated reloads within one process; a small fixed sample count keeps the row bounded and comparable
// across runs.
const COLD_OPTIONS = { iterations: 3, time: 0, warmupIterations: 1, warmupTime: 0 };
const WARM_OPTIONS = { time: 300 };
const SHORT_RESULT_RETRIES = 10;

class BenchObject extends Type.makeObject<BenchObject>(DXN.make('com.example.type.benchObject', '0.1.0'))(
  Schema.Struct({
    value: Schema.Number,
    label: Schema.String,
  }),
) {}

const wideFieldName = (index: number) => `field${index}`;
const wideSchemaFields = Object.fromEntries(
  Array.from({ length: WIDE_FIELD_COUNT }, (unusedValue, index) => [wideFieldName(index), Schema.String]),
);

class WideBenchObject extends Type.makeObject<WideBenchObject>(DXN.make('com.example.type.wideBenchObject', '0.1.0'))(
  Schema.Struct({
    value: Schema.Number,
    label: Schema.String,
    ...wideSchemaFields,
  }),
) {}

const widePadding: Record<string, string> = Object.fromEntries(
  Array.from({ length: WIDE_FIELD_COUNT }, (unusedValue, index) => [
    wideFieldName(index),
    `s${index}-${Math.floor(Math.random() * 1_000)}`,
  ]),
);

const storagePaths = [createTmpPath(), createTmpPath()];
process.once('exit', () => {
  for (const storagePath of storagePaths) {
    try {
      rmSync(storagePath, { recursive: true, force: true });
    } catch {
      // Best-effort: EchoTestBuilder.close() is async and can't run from a sync exit handler.
    }
  }
});

const builder = await new EchoTestBuilder().open();

type Populated = {
  peer: EchoTestPeer;
  db: EchoDatabase;
  count: number;
};

const populate = async (
  storagePath: string,
  type: typeof BenchObject | typeof WideBenchObject,
  count: number,
  make: (index: number) => BenchObject | WideBenchObject,
): Promise<Populated> => {
  const peer = await builder.createPeer({ types: [type], storagePath });
  const db = await peer.createDatabase();
  for (let index = 0; index < count; index++) {
    db.add(make(index));
  }
  await db.flush();
  return { peer, db, count };
};

const narrow = await populate(storagePaths[0], BenchObject, OBJECT_COUNT, (index) =>
  Obj.make(BenchObject, { value: index, label: `label-${index}` }),
);
const wide = await populate(storagePaths[1], WideBenchObject, WIDE_OBJECT_COUNT, (index) =>
  Obj.make(WideBenchObject, { ...widePadding, value: index, label: `label-${index}` }),
);

let checksum = 0;
const phaseSamples: Record<string, number[]> = {};
const record = (phase: string, ms: number) => {
  (phaseSamples[phase] ??= []).push(ms);
};

afterAll(async () => {
  blackhole(checksum);
  const lines = Object.entries(phaseSamples).map(([phase, samples]) => {
    const sorted = [...samples].sort((left, right) => left - right);
    const mean = samples.reduce((sum, sample) => sum + sample, 0) / samples.length;
    return `${phase.padEnd(44)} mean ${mean.toFixed(1).padStart(7)} ms   min ${sorted[0].toFixed(1).padStart(7)} ms   p50 ${sorted[Math.floor(sorted.length / 2)].toFixed(1).padStart(7)} ms   n=${samples.length}`;
  });
  // eslint-disable-next-line no-console
  console.log(`\nPhase timings (measured inside the cold rows):\n${lines.join('\n')}\n`);
  await narrow.peer.close();
  await wide.peer.close();
  await builder.close();
}, 300_000);

const defineRows = (label: string, state: Populated, type: typeof BenchObject | typeof WideBenchObject) => {
  describe(label, () => {
    const reopen = async (): Promise<EchoDatabase> => {
      const started = performance.now();
      await state.peer.reload();
      const db = await state.peer.openLastDatabase();
      record(`${label}: reload + open`, performance.now() - started);
      state.db = db;
      return db;
    };

    // A query straight after a reload can come back short: the index source gives each object's
    // document a bounded time to load and drops the ones that miss it. A short result is re-run rather
    // than thrown, and counted, so the row keeps its samples and the report shows how often it happened.
    const query = async (db: EchoDatabase, phase: string): Promise<(BenchObject | WideBenchObject)[]> => {
      const started = performance.now();
      let results = await db.query(Query.select(Filter.type(type))).run();
      for (let retry = 0; results.length !== state.count && retry < SHORT_RESULT_RETRIES; retry++) {
        record(`${label}: short result, re-ran (value = results returned)`, results.length);
        results = await db.query(Query.select(Filter.type(type))).run();
      }
      record(`${label}: ${phase}`, performance.now() - started);
      if (results.length !== state.count) {
        throw new Error(`Expected ${state.count} results, got ${results.length} after ${SHORT_RESULT_RETRIES} re-runs`);
      }
      return results;
    };

    const readAll = (results: (BenchObject | WideBenchObject)[], phase: string) => {
      const started = performance.now();
      let sum = 0;
      for (let index = 0; index < results.length; index++) {
        sum += results[index].value;
      }
      record(`${label}: ${phase}`, performance.now() - started);
      checksum += sum;
    };

    bench(
      'reload + open',
      async () => {
        await reopen();
      },
      COLD_OPTIONS,
    );

    bench(
      'reload + open + query',
      async () => {
        const db = await reopen();
        blackhole(await query(db, 'query (cold)'));
      },
      COLD_OPTIONS,
    );

    bench(
      'reload + open + query + read one field per result',
      async () => {
        const db = await reopen();
        readAll(await query(db, 'query (cold, before read)'), 'read one field per result (cold)');
      },
      COLD_OPTIONS,
    );

    bench(
      'query (warm)',
      async () => {
        blackhole(await query(state.db, 'query (warm)'));
      },
      WARM_OPTIONS,
    );

    bench(
      'query + read one field per result (warm)',
      async () => {
        readAll(await query(state.db, 'query (warm, before read)'), 'read one field per result (warm)');
      },
      WARM_OPTIONS,
    );
  });
};

describe('query materialization', { tags: ['manual'], timeout: 600_000 }, () => {
  defineRows(`narrow object (2 fields) × ${OBJECT_COUNT}`, narrow, BenchObject);
  defineRows(`wide object (${WIDE_FIELD_COUNT} fields) × ${WIDE_OBJECT_COUNT}`, wide, WideBenchObject);
});
