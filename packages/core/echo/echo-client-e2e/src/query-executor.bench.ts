//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { rmSync } from 'node:fs';
import { afterAll, bench, describe } from 'vitest';

import { Filter, Obj, Order, Query, type QueryResult, Ref, Type } from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-client';
import { EchoTestBuilder, type EchoTestPeer, createTmpPath } from '@dxos/echo-client/testing';
import { type ExecutionTrace } from '@dxos/echo-host';
import { TestSchema } from '@dxos/echo/testing';
import { DXN } from '@dxos/keys';

import { blackhole, parseBenchCount } from './testing/bench-util.ts';

//
// A query workload under the host's query executor, which compiles the plan into one SQLite statement
// over the index tables and loads no documents. It is the only executor; the memory-vs-sql comparison
// against the deleted in-memory executor is recorded in `BENCHMARKS.md`.
//
// One warm peer holds TASK_COUNT tasks (priority cycling 1..5, each assigned to one of PERSON_COUNT
// persons) and answers the `run:` rows; the `reactive first result` row opens a reactive query and
// waits for its first non-empty result, which is the host-side re-execution path. `afterAll` reads
// the host's execution traces for each query shape and prints them.
//
// The cold rows reload a file-backed peer and time the first `run()` of the type+property
// query; the reload is inside the timed body, since vitest's `bench()` has no per-iteration hooks,
// so the query-only phase is also recorded from inside the row and reported from `afterAll`.
//

const TASK_COUNT = parseBenchCount('QUERY_EXECUTOR_BENCH_COUNT', 2_000);
const PERSON_COUNT = 50;
const PRIORITY_LEVELS = 5;
const TARGET_PRIORITY = 3;
const ORDER_LIMIT = 20;
const SEED_BATCH_SIZE = 200;
const FIRST_RESULT_TIMEOUT_MS = 30_000;
const SHORT_RESULT_RETRIES = 10;
// tinybench warms up for 16 iterations by default; a short warm-up keeps the row bounded.
const WARM_OPTIONS = { time: 1_000, warmupIterations: 3 };
// Every cold sample reloads a peer; a small fixed sample count keeps the row bounded.
const COLD_OPTIONS = { iterations: 3, time: 0, warmupIterations: 1, warmupTime: 0 };

// `TestSchema.Task` carries no numeric field to filter and order on, so the bench types its own task
// with a `priority`; the assignee stays a `TestSchema.Person` so the reference row traverses a
// shared test type.
class BenchTask extends Type.makeObject<BenchTask>(DXN.make('com.example.type.benchTask', '0.1.0'))(
  Schema.Struct({
    title: Schema.optional(Schema.String),
    description: Schema.optional(Schema.String),
    // Optional like every `TestSchema` field: `Filter.eq(n)` is a `Filter<number | undefined>`, which the
    // typed props overload of `Filter.type` only accepts against an optional field.
    priority: Schema.optional(Schema.Number),
    assignee: Schema.optional(Ref.Ref(TestSchema.Person)),
  }),
) {}

const TYPES = [BenchTask, TestSchema.Person];
const taskIndices = Array.from({ length: TASK_COUNT }, (unusedValue, index) => index);
const priorityOf = (index: number) => (index % PRIORITY_LEVELS) + 1;
const assigneeOf = (index: number) => index % PERSON_COUNT;
const matchingIndices = taskIndices.filter((index) => priorityOf(index) === TARGET_PRIORITY);
const EXPECTED_MATCHES = matchingIndices.length;
// Distinct assignees of the matching tasks: with 50 persons and 5 priorities that is 10, not 50.
const EXPECTED_ASSIGNEES = new Set(matchingIndices.map(assigneeOf)).size;

type QueryShape = {
  label: string;
  query: Query.Any;
  expected: number;
};

const typeQuery = Query.select(Filter.type(BenchTask));
const propertyQuery = Query.select(Filter.type(BenchTask, { priority: Filter.eq(TARGET_PRIORITY) }));
const referenceQuery = Query.select(Filter.type(BenchTask, { priority: Filter.eq(TARGET_PRIORITY) })).reference(
  'assignee',
);
const orderQuery = Query.select(Filter.type(BenchTask)).orderBy(Order.property('priority', 'desc')).limit(ORDER_LIMIT);

const SHAPES: QueryShape[] = [
  { label: 'type', query: typeQuery, expected: TASK_COUNT },
  { label: 'type + property', query: propertyQuery, expected: EXPECTED_MATCHES },
  { label: 'reference traversal', query: referenceQuery, expected: EXPECTED_ASSIGNEES },
  { label: 'order + limit', query: orderQuery, expected: ORDER_LIMIT },
];

const coldStoragePath = createTmpPath();
process.once('exit', () => {
  try {
    rmSync(coldStoragePath, { recursive: true, force: true });
  } catch {
    // Best-effort: EchoTestBuilder.close() is async and can't run from a sync exit handler.
  }
});

const builder = await new EchoTestBuilder().open();

type Seeded = {
  peer: EchoTestPeer;
  db: EchoDatabase;
};

const seed = async (storagePath?: string): Promise<Seeded> => {
  const peer = await builder.createPeer({ types: TYPES, storagePath });
  const db = await peer.createDatabase();
  const persons = Array.from({ length: PERSON_COUNT }, (unusedValue, index) =>
    db.add(Obj.make(TestSchema.Person, { name: `person-${index}`, username: `user${index}` })),
  );
  for (let index = 0; index < TASK_COUNT; index++) {
    db.add(
      Obj.make(BenchTask, {
        title: `task-${index}`,
        description: `description of task ${index}`,
        priority: priorityOf(index),
        assignee: Ref.make(persons[assigneeOf(index)]),
      }),
    );
    if ((index + 1) % SEED_BATCH_SIZE === 0) {
      await db.flush();
    }
  }
  await db.flush({ indexes: true });
  return { peer, db };
};

const warm = await seed();
const cold = await seed(coldStoragePath);

let checksum = 0;
const phaseSamples: Record<string, number[]> = {};
const record = (phase: string, value: number) => {
  (phaseSamples[phase] ??= []).push(value);
};

const runExpecting = async (db: EchoDatabase, shape: QueryShape): Promise<unknown[]> => {
  const results = await db.query(shape.query).run();
  if (results.length !== shape.expected) {
    throw new Error(`${shape.label}: expected ${shape.expected} results, got ${results.length}`);
  }
  return results;
};

type FirstResult<T> = { value: T; unsubscribe: () => void };

/**
 * Opens a reactive query and resolves on its first non-empty result with whatever `read` takes from
 * it while the query is still active; the caller unsubscribes. Subscribing without `fire` means the
 * callback runs only once the host has executed the query.
 */
const awaitFirstResult = <T>(
  db: EchoDatabase,
  query: Query.Any,
  read: (result: QueryResult.QueryResult<unknown>) => T,
): Promise<FirstResult<T>> =>
  new Promise<FirstResult<T>>((resolve, reject) => {
    let unsubscribe: (() => void) | undefined;
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        unsubscribe?.();
        reject(new Error(`No reactive result within ${FIRST_RESULT_TIMEOUT_MS} ms`));
      }
    }, FIRST_RESULT_TIMEOUT_MS);
    unsubscribe = db.query(query).subscribe((result) => {
      if (settled || result.results.length === 0) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      // The teardown is left to the caller: unsubscribing here runs inside the query's own `changed`
      // emission, where a throw is routed to the context's error handler instead of this promise.
      resolve({ value: read(result), unsubscribe: () => unsubscribe?.() });
    });
  });

// The client caches `QueryResult` instances by query AST and fires a subscriber only when the result
// set changes, so re-subscribing to an identical query after the first sample would never fire. A
// limit above the result count changes the AST without changing the result, so every sample opens a
// fresh reactive query and a fresh host execution.
let reactiveCounter = 0;
const distinctPropertyQuery = (): Query.Any => propertyQuery.limit(TASK_COUNT + 1 + reactiveCounter++);

type TraceRow = {
  label: string;
  objectCount: number;
  documentsLoaded: number;
  indexHits: number;
  executionTime: number;
  documentLoadTime: number;
};

const sumTrace = (trace: ExecutionTrace, field: 'documentsLoaded' | 'indexHits' | 'documentLoadTime'): number =>
  trace[field] + trace.children.reduce((sum, child) => sum + sumTrace(child, field), 0);

/**
 * Runs each query shape as a reactive query on the warm peer and reads the host's trace of that run
 * while the query is still registered (traces are kept only for active queries).
 */
const collectTraces = async ({ peer, db }: Seeded): Promise<TraceRow[]> => {
  const rows: TraceRow[] = [];
  for (const shape of SHAPES) {
    const { value: trace, unsubscribe } = await awaitFirstResult(db, shape.query, () =>
      peer.host.queryService
        .getQueryTraces()
        .filter((candidate) => candidate.details.includes(Type.getTypename(BenchTask)))
        .sort((left, right) => right.endTs - left.endTs)
        .at(0),
    );
    unsubscribe();
    if (!trace) {
      throw new Error(`${shape.label}: no host trace found`);
    }
    rows.push({
      label: shape.label,
      objectCount: trace.objectCount,
      documentsLoaded: sumTrace(trace, 'documentsLoaded'),
      indexHits: sumTrace(trace, 'indexHits'),
      executionTime: trace.executionTime,
      documentLoadTime: sumTrace(trace, 'documentLoadTime'),
    });
  }
  return rows;
};

afterAll(async () => {
  blackhole(checksum);

  const traceRows = await collectTraces(warm);
  const traceLines = traceRows.map(
    (row) =>
      `${row.label.padEnd(20)} objects ${String(row.objectCount).padStart(5)}   docsLoaded ${String(row.documentsLoaded).padStart(5)}   indexHits ${String(row.indexHits).padStart(5)}   exec ${row.executionTime.toFixed(1).padStart(7)} ms   docLoad ${row.documentLoadTime.toFixed(1).padStart(7)} ms`,
  );
  // eslint-disable-next-line no-console
  console.log(`\nHost traces (reactive query, first run; N=${TASK_COUNT}):\n${traceLines.join('\n')}\n`);

  const phaseLines = Object.entries(phaseSamples).map(([phase, samples]) => {
    const sorted = [...samples].sort((left, right) => left - right);
    const mean = samples.reduce((sum, sample) => sum + sample, 0) / samples.length;
    return `${phase.padEnd(52)} mean ${mean.toFixed(1).padStart(8)}   min ${sorted[0].toFixed(1).padStart(8)}   max ${sorted[sorted.length - 1].toFixed(1).padStart(8)}   n=${samples.length}`;
  });
  if (phaseLines.length > 0) {
    // eslint-disable-next-line no-console
    console.log(`\nPhase timings (measured inside the cold rows, ms unless noted):\n${phaseLines.join('\n')}\n`);
  }

  await builder.close();
}, 300_000);

describe(`query executor (N=${TASK_COUNT})`, { tags: ['manual'], timeout: 600_000 }, () => {
  for (const shape of SHAPES) {
    bench(
      `run: ${shape.label}`,
      async () => {
        const results = await runExpecting(warm.db, shape);
        checksum += results.length;
      },
      WARM_OPTIONS,
    );
  }

  bench(
    'reactive first result (type + property)',
    async () => {
      const { value: count, unsubscribe } = await awaitFirstResult(
        warm.db,
        distinctPropertyQuery(),
        (result) => result.results.length,
      );
      unsubscribe();
      if (count !== EXPECTED_MATCHES) {
        throw new Error(`reactive: expected ${EXPECTED_MATCHES} results, got ${count}`);
      }
      checksum += count;
    },
    WARM_OPTIONS,
  );

  bench(
    'cold: reload + open + run type + property',
    async () => {
      const reloadStart = performance.now();
      await cold.peer.reload();
      const db = await cold.peer.openLastDatabase();
      cold.db = db;
      record('reload + open', performance.now() - reloadStart);

      // A query straight after a reload can come back short if the index is not yet complete. A short
      // result is re-run and counted so the row keeps its samples and the report shows how often it happened.
      const queryStart = performance.now();
      let results = await db.query(propertyQuery).run();
      for (let retry = 0; results.length !== EXPECTED_MATCHES && retry < SHORT_RESULT_RETRIES; retry++) {
        record('short cold result, re-ran (value = results returned)', results.length);
        results = await db.query(propertyQuery).run();
      }
      record('cold run type + property (to a full result set)', performance.now() - queryStart);
      if (results.length !== EXPECTED_MATCHES) {
        throw new Error(`cold: expected ${EXPECTED_MATCHES} results, got ${results.length}`);
      }
      checksum += results.length;
    },
    COLD_OPTIONS,
  );
});
