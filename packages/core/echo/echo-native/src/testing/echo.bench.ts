//
// Copyright 2026 DXOS.org
//

import { rmSync } from 'node:fs';
import { bench, describe } from 'vitest';

import { type Database, Feed, Filter, Obj, Query } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';

import {
  EchoTestBuilder as SqliteTestBuilder,
  createTmpPath as sqliteTmpPath,
} from '../../../echo-sqlite/src/testing/echo-test-builder.ts';
import { EchoTestBuilder as NativeTestBuilder, createTmpPath as nativeTmpPath } from './echo-test-builder.ts';

/** The database surface the benches use, which both engines provide. */
type EchoDatabase = Pick<Database.Database, 'add' | 'remove' | 'flush' | 'query' | 'removeFeedItemsByIds'>;

// echo-sqlite's `echo.bench.ts` run against both engines in one process, so the numbers compare:
// the same operations through the ECHO API, over automerge objects only (echo-native stores no feed
// items). echo-sqlite runs on a SQLite file in the OS temp dir; echo-native on its in-memory file.
const parseBenchCount = (envVar: string, fallback: number): number => {
  const value = Number(process.env[envVar] ?? fallback);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${envVar} must be a positive integer, got ${value}`);
  }
  return value;
};

const SEED_COUNT = parseBenchCount('ECHO_BENCH_SEED_COUNT', 200);
// Sized past what tinybench's 1s time floor could plausibly consume even after a large speedup,
// since a no-op past the pool's end (see the delete bench's exhaustion guard) would otherwise be
// counted as delete throughput and skew the reported hz.
const DELETE_POOL = parseBenchCount('ECHO_BENCH_DELETE_POOL', 1_000);
// `insert (batched)` shares one flush across a batch, since flushing per item forces an RPC/index
// round trip that batching avoids.
const BATCH_SIZE = parseBenchCount('ECHO_BENCH_BATCH_SIZE', 20);
const BENCH_OPTIONS = { time: 1_000 };

type Variant = {
  insert: (value: number) => Promise<TestSchema.Expando>;
  insertBatch: (values: number[]) => Promise<TestSchema.Expando[]>;
  scope: (filter: Filter.Any) => Query.Any;
  remove: (obj: TestSchema.Expando) => Promise<void>;
};

/**
 * Registers the shared insert/select/update/delete benches against whatever `makeVariant` builds.
 * Neither `beforeAll` nor `beforeEach` is guaranteed to resolve before a bench's first (warmup)
 * call with vitest's experimental `bench()` API (verified directly), so setup is a memoized lazy
 * singleton every bench awaits first — the one-time cost lands in that discarded warmup call, which
 * the reported min/max below (no outlier) confirm.
 */
const defineOperationBenches = (
  makeVariant: (db: EchoDatabase, feed: Feed.Feed) => Variant,
  ensureEcho: () => Promise<{ db: EchoDatabase; feed: Feed.Feed }>,
): void => {
  type SeedState = { seeded: TestSchema.Expando[]; deletePool: TestSchema.Expando[] };
  let seedPromise: Promise<SeedState> | undefined;
  let insertCounter = 0;
  let batchInsertCounter = 0;
  let deleteCounter = 0;

  const ensureSeed = (): Promise<SeedState> => {
    if (!seedPromise) {
      seedPromise = (async () => {
        const { db, feed } = await ensureEcho();
        const variant = makeVariant(db, feed);
        const seeded: TestSchema.Expando[] = [];
        for (let index = 0; index < SEED_COUNT; index++) {
          seeded.push(await variant.insert(index));
        }
        const deletePool: TestSchema.Expando[] = [];
        for (let index = 0; index < DELETE_POOL; index++) {
          deletePool.push(await variant.insert(20_000_000 + index));
        }
        return { seeded, deletePool };
      })();
    }
    return seedPromise;
  };

  bench(
    'insert',
    async () => {
      const { db, feed } = await ensureEcho();
      await makeVariant(db, feed).insert(10_000_000 + insertCounter++);
    },
    BENCH_OPTIONS,
  );

  // hz below is batches/sec (one invocation inserts BATCH_SIZE objects), not items/sec — divide
  // the reported mean by BATCH_SIZE to compare against `insert`'s per-item latency.
  bench(
    `insert (batched x${BATCH_SIZE}, single flush)`,
    async () => {
      const { db, feed } = await ensureEcho();
      const base = 30_000_000 + batchInsertCounter;
      batchInsertCounter += BATCH_SIZE;
      const values = Array.from({ length: BATCH_SIZE }, (unusedValue, index) => base + index);
      await makeVariant(db, feed).insertBatch(values);
    },
    BENCH_OPTIONS,
  );

  bench(
    'select (point, by id)',
    async () => {
      const { db, feed } = await ensureEcho();
      const { seeded } = await ensureSeed();
      const obj = seeded[Math.floor(Math.random() * seeded.length)];
      await db.query(makeVariant(db, feed).scope(Filter.id(obj.id))).run();
    },
    BENCH_OPTIONS,
  );

  bench(
    'select (filtered scan)',
    async () => {
      const { db, feed } = await ensureEcho();
      await ensureSeed();
      const lo = Math.floor(Math.random() * SEED_COUNT * 0.9);
      const range = Filter.and(
        Filter.type(TestSchema.Expando),
        Filter.props({ value: Filter.between(lo, lo + SEED_COUNT / 10) }),
      );
      await db.query(makeVariant(db, feed).scope(range)).run();
    },
    BENCH_OPTIONS,
  );

  bench(
    'update (point, by id)',
    async () => {
      const { db } = await ensureEcho();
      const { seeded } = await ensureSeed();
      const obj = seeded[Math.floor(Math.random() * seeded.length)];
      Obj.update(obj, (obj) => {
        obj.value = Math.floor(Math.random() * 1_000_000);
      });
      await db.flush();
    },
    BENCH_OPTIONS,
  );

  bench(
    'delete (point, by id)',
    async () => {
      const { db, feed } = await ensureEcho();
      const { deletePool } = await ensureSeed();
      // The pool is finite; a bench can outrun it once warmup iterations are included.
      if (deleteCounter >= deletePool.length) {
        return;
      }
      const obj = deletePool[deleteCounter++];
      await makeVariant(db, feed).remove(obj);
    },
    BENCH_OPTIONS,
  );
};

const engines = [
  { name: 'echo-sqlite', Builder: SqliteTestBuilder, tmpPath: sqliteTmpPath },
  { name: 'echo-native', Builder: NativeTestBuilder, tmpPath: nativeTmpPath },
] as const;

for (const { name, Builder, tmpPath } of engines) {
  describe(`${name}: automerge object`, { tags: ['manual'], timeout: 300_000 }, () => {
    type EchoState = { db: EchoDatabase; feed: Feed.Feed };
    let echoPromise: Promise<EchoState> | undefined;

    const ensureEcho = (): Promise<EchoState> => {
      if (!echoPromise) {
        echoPromise = (async () => {
          const storagePath = tmpPath();
          process.once('exit', () => {
            try {
              rmSync(storagePath, { recursive: true, force: true });
            } catch {
              // Best-effort: the builder's close is async and cannot run from a sync exit handler.
            }
          });
          const builder = await new Builder().open();
          const peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Expando], storagePath });
          const db = await peer.createDatabase();
          // The benches never append to it; it keeps the setup identical to echo-sqlite's bench.
          const feed = Feed.make({ name: 'bench' });
          await db.flush();
          return { db, feed };
        })();
      }
      return echoPromise;
    };

    defineOperationBenches(
      (db) => ({
        insert: async (value) => {
          const obj = db.add(Obj.make(TestSchema.Expando, { value, label: `label-${value}` }));
          await db.flush();
          return obj;
        },
        insertBatch: async (values) => {
          const objs = values.map((value) => db.add(Obj.make(TestSchema.Expando, { value, label: `label-${value}` })));
          await db.flush();
          return objs;
        },
        scope: (filter) => Query.select(filter),
        remove: async (obj) => {
          db.remove(obj);
          await db.flush();
        },
      }),
      ensureEcho,
    );
  });
}
