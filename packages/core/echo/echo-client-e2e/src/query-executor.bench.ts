//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { rmSync, writeFileSync } from 'node:fs';
import v8 from 'node:v8';
import vm from 'node:vm';
import { afterAll, bench, describe } from 'vitest';

import { Filter, Obj, Order, Query, type QueryResult, Ref, Type } from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-client';
import { EchoTestBuilder, type EchoTestPeer, createTmpPath } from '@dxos/echo-client/testing';
import { type ExecutionTrace } from '@dxos/echo-host';
import { TestSchema } from '@dxos/echo/testing';
import { DXN } from '@dxos/keys';

import { blackhole, parseBenchCount } from './testing/bench-util.ts';

//
// A query workload under one of the host's two query executors, selected by `DX_ECHO_QUERY_EXECUTOR`
// (`memory`, the default, loads the objects a plan touches and evaluates it in JS; `sql` compiles the
// plan into one SQLite statement and loads nothing). One run measures one mode; `BENCHMARKS.md`
// records the pairs.
//
// One warm peer holds a mixed population: TASK_COUNT tasks (priority cycling 1..5, each assigned to
// one of PERSON_COUNT persons), half as many notes with ~1 KB bodies, half as many events, a few
// organizations and the persons. The `run:` rows query the tasks and events out of that pool; the
// `reactive first result` row opens a reactive query and waits for its first non-empty result, which
// is the host-side re-execution path. `afterAll` reads the host's execution traces for each query
// shape and prints them.
//
// The store is seeded once, into the file-backed warm peer; the cold peer opens a copy of that SQLite
// file (`exportSqliteDatabase`), because seeding a second peer in the same process gets slower with
// everything the first one left resident and hits the 30 s flush RPC timeout around 10k objects. The
// cold row reloads that peer and times the first `run()` of the type+property query; the reload is
// inside the timed body, since vitest's `bench()` has no per-iteration hooks, so the query-only phase
// is also recorded from inside the row and reported from `afterAll`.
//
// Memory is measured from `afterAll`, outside tinybench: for each shape the heap is collected, the
// query run a few times under a 1 ms sampler recording peak heap and RSS, and collected again for the
// retained delta. The cold peer gets the same treatment across a reload, which is where a query's
// document loads stay resident.
//

const TASK_COUNT = parseBenchCount('QUERY_EXECUTOR_BENCH_COUNT', 2_000);
const NOTE_COUNT = Math.ceil(TASK_COUNT / 2);
const EVENT_COUNT = Math.ceil(TASK_COUNT / 2);
const ORG_COUNT = Math.max(10, Math.ceil(TASK_COUNT / 20));
const PERSON_COUNT = 50;
const PRIORITY_LEVELS = 5;
const TARGET_PRIORITY = 3;
const EVENT_KINDS = ['meeting', 'call', 'deadline'] as const;
const TARGET_EVENT_KIND = 'deadline';
const ORDER_LIMIT = 20;
const SEED_BATCH_SIZE = 200;
const SEED_PROGRESS_EVERY = 1_000;
const FIRST_RESULT_TIMEOUT_MS = 30_000;
const SHORT_RESULT_RETRIES = 10;
const MEMORY_ITERATIONS = 3;
// `process.memoryUsage()` reads /proc on every call; at 1 ms the sampler ate enough of the event loop to
// push the client's 2 s per-object load budget over on a cold 1,000-result query. 10 ms still gives a
// dozen samples per warm iteration.
const MEMORY_SAMPLE_INTERVAL_MS = 10;
// tinybench warms up for 16 iterations by default; a short warm-up keeps the row bounded.
const WARM_OPTIONS = { time: 1_000, warmupIterations: 3 };
// Every cold sample reloads a peer; a small fixed sample count keeps the row bounded.
const COLD_OPTIONS = { iterations: 3, time: 0, warmupIterations: 1, warmupTime: 0 };
// Set only when the bench runs against a build that still carries the executor switch; labels the output.
const EXECUTOR_LABEL = process.env.DX_ECHO_QUERY_EXECUTOR;

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

/** Larger documents than a task, so document loads on a type the query does not select still cost. */
class BenchNote extends Type.makeObject<BenchNote>(DXN.make('com.example.type.benchNote', '0.1.0'))(
  Schema.Struct({
    title: Schema.optional(Schema.String),
    body: Schema.optional(Schema.String),
    tags: Schema.optional(Schema.Array(Schema.String)),
  }),
) {}

/** A second queried type, filtered on a string property rather than a number. */
class BenchEvent extends Type.makeObject<BenchEvent>(DXN.make('com.example.type.benchEvent', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    kind: Schema.optional(Schema.String),
    day: Schema.optional(Schema.Number),
    organizer: Schema.optional(Ref.Ref(TestSchema.Person)),
  }),
) {}

const TYPES = [BenchTask, BenchNote, BenchEvent, TestSchema.Person, TestSchema.Organization];
const TOTAL_OBJECTS = TASK_COUNT + NOTE_COUNT + EVENT_COUNT + ORG_COUNT + PERSON_COUNT;
const NOTE_BODY = 'lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt. '.repeat(
  11,
);

const taskIndices = Array.from({ length: TASK_COUNT }, (unusedValue, index) => index);
const priorityOf = (index: number) => (index % PRIORITY_LEVELS) + 1;
const assigneeOf = (index: number) => index % PERSON_COUNT;
const eventKindOf = (index: number) => EVENT_KINDS[index % EVENT_KINDS.length];
const matchingIndices = taskIndices.filter((index) => priorityOf(index) === TARGET_PRIORITY);
const EXPECTED_MATCHES = matchingIndices.length;
// Distinct assignees of the matching tasks: with 50 persons and 5 priorities that is 10, not 50.
const EXPECTED_ASSIGNEES = new Set(matchingIndices.map(assigneeOf)).size;
const EXPECTED_EVENT_MATCHES = Array.from({ length: EVENT_COUNT }, (unusedValue, index) => index).filter(
  (index) => eventKindOf(index) === TARGET_EVENT_KIND,
).length;

type QueryShape = {
  label: string;
  query: Query.Any;
  expected: number;
  /** The typename whose host trace the shape's reactive run leaves behind. */
  traceType: string;
};

const typeQuery = Query.select(Filter.type(BenchTask));
const propertyQuery = Query.select(Filter.type(BenchTask, { priority: Filter.eq(TARGET_PRIORITY) }));
const referenceQuery = Query.select(Filter.type(BenchTask, { priority: Filter.eq(TARGET_PRIORITY) })).reference(
  'assignee',
);
const orderQuery = Query.select(Filter.type(BenchTask)).orderBy(Order.property('priority', 'desc')).limit(ORDER_LIMIT);
const eventKindQuery = Query.select(Filter.type(BenchEvent, { kind: Filter.eq(TARGET_EVENT_KIND) }));
const unionQuery = Query.all(Query.select(Filter.type(BenchNote)), Query.select(Filter.type(TestSchema.Organization)));

const SHAPES: QueryShape[] = [
  { label: 'type', query: typeQuery, expected: TASK_COUNT, traceType: Type.getTypename(BenchTask) },
  {
    label: 'type + property',
    query: propertyQuery,
    expected: EXPECTED_MATCHES,
    traceType: Type.getTypename(BenchTask),
  },
  {
    label: 'reference traversal',
    query: referenceQuery,
    expected: EXPECTED_ASSIGNEES,
    traceType: Type.getTypename(BenchTask),
  },
  { label: 'order + limit', query: orderQuery, expected: ORDER_LIMIT, traceType: Type.getTypename(BenchTask) },
  {
    label: 'type + string property',
    query: eventKindQuery,
    expected: EXPECTED_EVENT_MATCHES,
    traceType: Type.getTypename(BenchEvent),
  },
  {
    label: 'union of two types',
    query: unionQuery,
    expected: NOTE_COUNT + ORG_COUNT,
    traceType: Type.getTypename(BenchNote),
  },
];

const warmStoragePath = createTmpPath();
const coldStoragePath = createTmpPath();
process.once('exit', () => {
  for (const path of [warmStoragePath, coldStoragePath]) {
    for (const suffix of ['', '-wal', '-shm']) {
      try {
        rmSync(`${path}${suffix}`, { force: true });
      } catch {
        // Best-effort: EchoTestBuilder.close() is async and can't run from a sync exit handler.
      }
    }
  }
});

// `--expose-gc` is a startup flag vitest's workers do not carry; setting it at runtime and pulling `gc`
// out of a fresh context is the documented way to get it after startup.
v8.setFlagsFromString('--expose_gc');
const exposedGc: unknown = vm.runInNewContext('gc');
const forceGc = (): void => {
  if (typeof exposedGc !== 'function') {
    throw new Error('gc() is not exposed');
  }
  exposedGc();
};

/** Row and memory-pass errors, printed from `afterAll`; tinybench and a failing hook otherwise hide them. */
const failures: string[] = [];

/** A macrotask turn, so finalization registry callbacks and freed handles settle before sampling. */
const settle = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

type MemoryRow = {
  label: string;
  /** Heap in use after a collection, before the measured work (bytes). */
  baselineHeap: number;
  /** Highest sampled heap during the work, over the baseline (bytes). */
  peakHeapDelta: number;
  /** Heap still in use after the work and a collection, over the baseline (bytes). */
  retainedHeapDelta: number;
  /** Same two deltas for the process RSS, which also carries SQLite's own memory and Automerge's WASM heap. */
  peakRssDelta: number;
  retainedRssDelta: number;
};

/** Resolves to nothing when `work` throws, so the remaining measurements and the table still run. */
const measureMemory = async (label: string, work: () => Promise<void>): Promise<MemoryRow | undefined> => {
  forceGc();
  await settle();
  const before = process.memoryUsage();
  let peakHeap = before.heapUsed;
  let peakRss = before.rss;
  const sample = () => {
    peakHeap = Math.max(peakHeap, v8.getHeapStatistics().used_heap_size);
    peakRss = Math.max(peakRss, process.memoryUsage.rss());
  };
  const timer = setInterval(sample, MEMORY_SAMPLE_INTERVAL_MS);
  try {
    await work();
  } catch (error) {
    failures.push(`memory pass, ${label}: ${error instanceof Error ? error.message : String(error)}`);
    return undefined;
  } finally {
    clearInterval(timer);
  }
  sample();
  forceGc();
  await settle();
  const after = process.memoryUsage();
  return {
    label,
    baselineHeap: before.heapUsed,
    peakHeapDelta: peakHeap - before.heapUsed,
    retainedHeapDelta: after.heapUsed - before.heapUsed,
    peakRssDelta: peakRss - before.rss,
    retainedRssDelta: after.rss - before.rss,
  };
};

const megabytes = (bytes: number): string => `${(bytes / 1_048_576).toFixed(1).padStart(8)} MB`;

const builder = await new EchoTestBuilder().open();

type Seeded = {
  peer: EchoTestPeer;
  db: EchoDatabase;
};

const seed = async (storagePath: string): Promise<Seeded> => {
  const peer = await builder.createPeer({ types: TYPES, storagePath });
  const db = await peer.createDatabase();
  const persons = Array.from({ length: PERSON_COUNT }, (unusedValue, index) =>
    db.add(Obj.make(TestSchema.Person, { name: `person-${index}`, username: `user${index}` })),
  );
  for (let index = 0; index < ORG_COUNT; index++) {
    db.add(Obj.make(TestSchema.Organization, { name: `org-${index}`, properties: { region: `region-${index % 7}` } }));
  }
  // Seeding dominates a large run and the RPC behind `flush` times out at 30 s, so the log shows where
  // the per-flush cost goes as the store grows.
  let added = 0;
  let slowestFlush = 0;
  const phaseStart = performance.now();
  const addBatched = async (object: Obj.Any) => {
    db.add(object);
    if (++added % SEED_BATCH_SIZE === 0) {
      const flushStart = performance.now();
      await db.flush();
      slowestFlush = Math.max(slowestFlush, performance.now() - flushStart);
    }
    if (added % SEED_PROGRESS_EVERY === 0) {
      const elapsed = (performance.now() - phaseStart) / 1000;
      // eslint-disable-next-line no-console
      console.log(
        `seed: ${added} objects, ${elapsed.toFixed(0)} s, slowest flush in window ${slowestFlush.toFixed(0)} ms`,
      );
      slowestFlush = 0;
    }
  };
  for (let index = 0; index < TASK_COUNT; index++) {
    await addBatched(
      Obj.make(BenchTask, {
        title: `task-${index}`,
        description: `description of task ${index}`,
        priority: priorityOf(index),
        assignee: Ref.make(persons[assigneeOf(index)]),
      }),
    );
  }
  for (let index = 0; index < NOTE_COUNT; index++) {
    await addBatched(
      Obj.make(BenchNote, {
        title: `note-${index}`,
        body: NOTE_BODY,
        tags: [`tag-${index % 13}`, `tag-${index % 29}`],
      }),
    );
  }
  for (let index = 0; index < EVENT_COUNT; index++) {
    await addBatched(
      Obj.make(BenchEvent, {
        name: `event-${index}`,
        kind: eventKindOf(index),
        day: index % 30,
        organizer: Ref.make(persons[index % PERSON_COUNT]),
      }),
    );
  }
  await db.flush({ indexes: true });
  return { peer, db };
};

const seedStart = performance.now();
const warm = await seed(warmStoragePath);
const seedTime = performance.now() - seedStart;
writeFileSync(coldStoragePath, await warm.peer.exportSqliteDatabase());
const coldPeer = await builder.createPeer({ types: TYPES, storagePath: coldStoragePath });
const cold: Seeded = { peer: coldPeer, db: await coldPeer.openLastDatabase() };
forceGc();
await settle();
const afterSeed = process.memoryUsage();

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

// A root trace without a stamped start reads its duration from epoch zero; the step traces under it are
// stamped, so their sum is the comparable figure.
const executionTimeOf = (trace: ExecutionTrace): number =>
  trace.beginTs === 0 && trace.children.length > 0
    ? trace.children.reduce((sum, child) => sum + child.executionTime, 0)
    : trace.executionTime;

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
        .filter((candidate) => candidate.details.includes(shape.traceType))
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
      executionTime: executionTimeOf(trace),
      documentLoadTime: sumTrace(trace, 'documentLoadTime'),
    });
  }
  return rows;
};

const collectMemory = async (): Promise<MemoryRow[]> => {
  const rows: (MemoryRow | undefined)[] = [];
  for (const shape of SHAPES) {
    rows.push(
      await measureMemory(`warm: ${shape.label} x${MEMORY_ITERATIONS}`, async () => {
        for (let iteration = 0; iteration < MEMORY_ITERATIONS; iteration++) {
          checksum += (await runExpecting(warm.db, shape)).length;
        }
      }),
    );
  }
  rows.push(
    await measureMemory('cold: reload + open + run type + property', async () => {
      await cold.peer.reload();
      cold.db = await cold.peer.openLastDatabase();
      const queryStart = performance.now();
      let results = await cold.db.query(propertyQuery).run();
      for (let retry = 0; results.length !== EXPECTED_MATCHES && retry < SHORT_RESULT_RETRIES; retry++) {
        results = await cold.db.query(propertyQuery).run();
      }
      record('cold run type + property, memory pass (to a full result set)', performance.now() - queryStart);
      checksum += results.length;
    }),
  );
  rows.push(
    await measureMemory('cold: then run type (all tasks)', async () => {
      checksum += (await runExpecting(cold.db, SHAPES[0])).length;
    }),
  );
  return rows.filter((row) => row !== undefined);
};

afterAll(async () => {
  blackhole(checksum);
  const header = `N=${TASK_COUNT} tasks, ${TOTAL_OBJECTS} objects per peer${EXECUTOR_LABEL ? `, executor=${EXECUTOR_LABEL}` : ''}`;

  const traceRows = await collectTraces(warm);
  const traceLines = traceRows.map(
    (row) =>
      `${row.label.padEnd(24)} objects ${String(row.objectCount).padStart(6)}   docsLoaded ${String(row.documentsLoaded).padStart(6)}   indexHits ${String(row.indexHits).padStart(6)}   exec ${row.executionTime.toFixed(1).padStart(8)} ms   docLoad ${row.documentLoadTime.toFixed(1).padStart(8)} ms`,
  );
  // eslint-disable-next-line no-console
  console.log(`\nHost traces (reactive query, first run; ${header}):\n${traceLines.join('\n')}\n`);

  const memoryRows = await collectMemory();
  const memoryLines = memoryRows.map(
    (row) =>
      `${row.label.padEnd(44)} baseline heap ${megabytes(row.baselineHeap)}   peak heap +${megabytes(row.peakHeapDelta)}   retained heap ${row.retainedHeapDelta < 0 ? '-' : '+'}${megabytes(Math.abs(row.retainedHeapDelta))}   peak rss +${megabytes(row.peakRssDelta)}   retained rss ${row.retainedRssDelta < 0 ? '-' : '+'}${megabytes(Math.abs(row.retainedRssDelta))}`,
  );
  // eslint-disable-next-line no-console
  console.log(
    `\nMemory (${header}; seed ${(seedTime / 1000).toFixed(1)} s, after seed + gc: heap ${megabytes(afterSeed.heapUsed)}, rss ${megabytes(afterSeed.rss)}, external ${megabytes(afterSeed.external)}):\n${memoryLines.join('\n')}\n`,
  );

  const phaseLines = Object.entries(phaseSamples).map(([phase, samples]) => {
    const sorted = [...samples].sort((left, right) => left - right);
    const mean = samples.reduce((sum, sample) => sum + sample, 0) / samples.length;
    return `${phase.padEnd(52)} mean ${mean.toFixed(1).padStart(8)}   min ${sorted[0].toFixed(1).padStart(8)}   max ${sorted[sorted.length - 1].toFixed(1).padStart(8)}   n=${samples.length}`;
  });
  if (phaseLines.length > 0) {
    // eslint-disable-next-line no-console
    console.log(`\nPhase timings (measured inside the cold rows, ms unless noted):\n${phaseLines.join('\n')}\n`);
  }
  if (failures.length > 0) {
    // eslint-disable-next-line no-console
    console.log(`\nRow failures:\n${failures.join('\n')}\n`);
  }

  await builder.close();
}, 600_000);

describe(
  `query executor (N=${TASK_COUNT}${EXECUTOR_LABEL ? `, ${EXECUTOR_LABEL}` : ''})`,
  { tags: ['manual'], timeout: 1_200_000 },
  () => {
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
        try {
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
        } catch (error) {
          // tinybench keeps a failed task's error to itself and vitest prints the row without samples.
          record('cold run FAILED (value = ms until the error)', performance.now() - queryStart);
          failures.push(`cold run: ${error instanceof Error ? error.message : String(error)}`);
          throw error;
        }
      },
      COLD_OPTIONS,
    );
  },
);
