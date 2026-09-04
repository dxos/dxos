//
// Copyright 2026 DXOS.org
//

import { rmSync } from 'node:fs';
import { bench, describe } from 'vitest';

import { Feed, Filter, Obj, Query } from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-client';
import { EchoTestBuilder, createTmpPath } from '@dxos/echo-client/testing';
import { TestSchema } from '@dxos/echo/testing';

import { parseBenchCount } from './testing/bench-util';

// Same 5 operations as `sqlite.bench.ts`, run through the ECHO API instead of raw SQL, over the
// two object storage kinds: automerge objects (`db.add`) and feed objects (`db.add(obj, { to:
// feed })`).
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

describe('echo benchmarks (feed objects vs automerge objects)', { tags: ['manual'], timeout: 300_000 }, () => {
  type EchoState = { db: EchoDatabase; feed: Feed.Feed };
  let echoPromise: Promise<EchoState> | undefined;

  const ensureEcho = (): Promise<EchoState> => {
    if (!echoPromise) {
      echoPromise = (async () => {
        const storagePath = createTmpPath();
        process.once('exit', () => {
          try {
            rmSync(storagePath, { recursive: true, force: true });
          } catch {
            // Best-effort: EchoTestBuilder.close() is async and can't run from a sync exit
            // handler; acceptable for a manual benchmark script whose process exits right after.
          }
        });

        const builder = await new EchoTestBuilder().open();
        const peer = await builder.createPeer({ types: [Feed.Feed, TestSchema.Expando], storagePath });
        const db = await peer.createDatabase();
        const feed = db.add(Feed.make({ name: 'bench' }));
        await db.flush();
        return { db, feed };
      })();
    }
    return echoPromise;
  };

  describe('automerge object', () => {
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

  describe('feed object', () => {
    defineOperationBenches(
      (db, feed) => ({
        insert: async (value) => {
          const obj = db.add(Obj.make(TestSchema.Expando, { value, label: `label-${value}` }), { to: feed });
          await db.flush();
          return obj;
        },
        insertBatch: async (values) => {
          const objs = values.map((value) =>
            db.add(Obj.make(TestSchema.Expando, { value, label: `label-${value}` }), { to: feed }),
          );
          await db.flush();
          return objs;
        },
        scope: (filter) => Query.select(filter).from(feed),
        remove: async (obj) => {
          await db.removeFeedItemsByIds(feed, [obj.id]);
          await db.flush();
        },
      }),
      ensureEcho,
    );
  });
});
