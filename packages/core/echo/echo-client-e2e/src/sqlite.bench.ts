//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import * as SqlClient from 'effect/unstable/sql/SqlClient';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { bench, describe } from 'vitest';

import { layerFile } from '@dxos/sql-sqlite/platform';

import { parseBenchCount } from './testing/bench-util';

// Raw-SQLite baseline for the ECHO benchmarks in `echo.bench.ts`, run through the same driver
// (`@dxos/sql-sqlite`'s node layer) so the delta between the two isolates ECHO's overhead.
const SEED_ROWS = parseBenchCount('SQLITE_BENCH_SEED_ROWS', 2_000);
// Sized past what tinybench's 1s time floor could plausibly consume, since insert/delete need a
// fresh row per call and the value column is offset outside the seed range to avoid skewing the
// filtered-scan bench.
const DELETE_POOL = parseBenchCount('SQLITE_BENCH_DELETE_POOL', 20_000);
const BENCH_OPTIONS = { time: 1_000 };

describe('sqlite benchmarks (raw)', { tags: ['manual'], timeout: 120_000 }, () => {
  type State = { runtime: ManagedRuntime.ManagedRuntime<SqlClient.SqlClient, never>; seededIds: string[] };
  let statePromise: Promise<State> | undefined;
  let insertCounter = 0;
  let deleteCounter = 0;

  // Neither `beforeAll` nor `beforeEach` is guaranteed to resolve before a bench's first (warmup)
  // call with vitest's experimental `bench()` API (verified directly), so setup is a memoized lazy
  // singleton every bench awaits first — the one-time cost lands in that discarded warmup call.
  const ensureState = (): Promise<State> => {
    if (!statePromise) {
      statePromise = (async () => {
        const dir = mkdtempSync(join(tmpdir(), 'dxos-sqlite-bench-'));
        process.once('exit', () => {
          try {
            rmSync(dir, { recursive: true, force: true });
          } catch {
            // Best-effort: the OS temp directory is cleaned up independently either way.
          }
        });

        const runtime = ManagedRuntime.make(layerFile(join(dir, 'bench.db')).pipe(Layer.orDie));
        const seededIds: string[] = [];
        await runtime.runPromise(
          Effect.gen(function* () {
            const sql = yield* SqlClient.SqlClient;
            yield* sql`CREATE TABLE items (id TEXT PRIMARY KEY, value INTEGER NOT NULL, label TEXT NOT NULL)`;
            yield* sql`CREATE INDEX items_value ON items (value)`;
            // Bulk-seeded in one transaction, since setup speed isn't the measured metric.
            yield* sql.withTransaction(
              Effect.gen(function* () {
                for (let index = 0; index < SEED_ROWS; index++) {
                  const id = `seed-${index}`;
                  seededIds.push(id);
                  yield* sql`INSERT INTO items (id, value, label) VALUES (${id}, ${index}, ${`label-${index}`})`;
                }
                for (let index = 0; index < DELETE_POOL; index++) {
                  yield* sql`INSERT INTO items (id, value, label) VALUES (${`delete-${index}`}, ${20_000_000 + index}, ${`label-${index}`})`;
                }
              }),
            );
          }),
        );
        return { runtime, seededIds };
      })();
    }
    return statePromise;
  };

  bench(
    'insert',
    async () => {
      const { runtime } = await ensureState();
      await runtime.runPromise(
        Effect.gen(function* () {
          const sql = yield* SqlClient.SqlClient;
          const index = insertCounter++;
          yield* sql`INSERT INTO items (id, value, label) VALUES (${`insert-${index}`}, ${10_000_000 + index}, ${`label-${index}`})`;
        }),
      );
    },
    BENCH_OPTIONS,
  );

  bench(
    'select (point, by primary key)',
    async () => {
      const { runtime, seededIds } = await ensureState();
      await runtime.runPromise(
        Effect.gen(function* () {
          const sql = yield* SqlClient.SqlClient;
          const id = seededIds[Math.floor(Math.random() * seededIds.length)];
          yield* sql`SELECT * FROM items WHERE id = ${id}`;
        }),
      );
    },
    BENCH_OPTIONS,
  );

  bench(
    'select (filtered range scan)',
    async () => {
      const { runtime } = await ensureState();
      await runtime.runPromise(
        Effect.gen(function* () {
          const sql = yield* SqlClient.SqlClient;
          const lo = Math.floor(Math.random() * SEED_ROWS * 0.9);
          yield* sql`SELECT * FROM items WHERE value >= ${lo} AND value < ${lo + SEED_ROWS / 10}`;
        }),
      );
    },
    BENCH_OPTIONS,
  );

  bench(
    'update (point, by primary key)',
    async () => {
      const { runtime, seededIds } = await ensureState();
      await runtime.runPromise(
        Effect.gen(function* () {
          const sql = yield* SqlClient.SqlClient;
          const id = seededIds[Math.floor(Math.random() * seededIds.length)];
          yield* sql`UPDATE items SET value = ${Math.floor(Math.random() * 1_000_000)} WHERE id = ${id}`;
        }),
      );
    },
    BENCH_OPTIONS,
  );

  bench(
    'delete (point, by primary key)',
    async () => {
      const { runtime } = await ensureState();
      await runtime.runPromise(
        Effect.gen(function* () {
          const sql = yield* SqlClient.SqlClient;
          const id = `delete-${deleteCounter++}`;
          yield* sql`DELETE FROM items WHERE id = ${id}`;
        }),
      );
    },
    BENCH_OPTIONS,
  );
});
