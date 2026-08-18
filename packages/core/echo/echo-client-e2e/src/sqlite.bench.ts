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

// Raw-SQLite baseline for the ECHO benchmarks in `echo.bench.ts`: same driver (`@dxos/sql-sqlite`'s
// node layer, i.e. `@effect/sql-sqlite-node`), same file-backed storage, so the delta between this
// suite and that one isolates ECHO's overhead rather than a driver difference. Uses vitest's
// standard `bench()` API (tinybench under the hood) — opt-in ('manual' tag) since a timing report
// isn't a pass/fail assertion, run via `DX_RUN_MANUAL_TESTS=1 pnpm exec vitest bench --project=node`.
const SEED_ROWS = parseBenchCount('SQLITE_BENCH_SEED_ROWS', 2_000);
// tinybench's `time` is a floor, not a cap — a bench keeps calling its function until the time
// budget elapses, so the exact call count isn't known upfront. Insert/delete need fresh rows per
// call, so their pools are sized to comfortably outlast the 1s budget below even on a much faster
// machine; the value column is offset well outside the seed range so they never leak into the
// filtered-scan bench's result set.
const DELETE_POOL = parseBenchCount('SQLITE_BENCH_DELETE_POOL', 20_000);
const BENCH_OPTIONS = { time: 1_000 };

describe('sqlite benchmarks (raw)', { tags: ['manual'], timeout: 120_000 }, () => {
  type State = { runtime: ManagedRuntime.ManagedRuntime<SqlClient.SqlClient, never>; seededIds: string[] };
  let statePromise: Promise<State> | undefined;
  let insertCounter = 0;
  let deleteCounter = 0;

  // `beforeAll`/`afterAll` aren't reliable with vitest's experimental `bench()` API — a bench's
  // warmup can start before `beforeAll` resolves — so setup is a memoized lazy singleton every
  // bench awaits first, and teardown is a best-effort process-exit hook rather than `afterAll`.
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
            // Bulk-seeded in one transaction — setup speed isn't the measured metric, only the
            // benched operations' individual (implicitly autocommitted) statements are.
            yield* sql.withTransaction(
              Effect.gen(function* () {
                for (let i = 0; i < SEED_ROWS; i++) {
                  const id = `seed-${i}`;
                  seededIds.push(id);
                  yield* sql`INSERT INTO items (id, value, label) VALUES (${id}, ${i}, ${`label-${i}`})`;
                }
                for (let i = 0; i < DELETE_POOL; i++) {
                  yield* sql`INSERT INTO items (id, value, label) VALUES (${`delete-${i}`}, ${20_000_000 + i}, ${`label-${i}`})`;
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
          const i = insertCounter++;
          yield* sql`INSERT INTO items (id, value, label) VALUES (${`insert-${i}`}, ${10_000_000 + i}, ${`label-${i}`})`;
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
