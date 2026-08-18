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
import { afterAll, beforeAll, describe, test } from 'vitest';

import { layerFile } from '@dxos/sql-sqlite/platform';
import { range } from '@dxos/util';

import { type BenchResult, printResults, runBench } from './testing/bench-util';

// Raw-SQLite baseline for the ECHO benchmarks in `echo-benchmarks.test.ts`: same driver
// (`@dxos/sql-sqlite`'s node layer, i.e. `@effect/sql-sqlite-node`), same file-backed storage, so
// the delta between this suite and that one isolates ECHO's overhead rather than a driver
// difference. Opt-in ('manual' tag) since it's a timing report, not a pass/fail assertion.
const N = Number(process.env.SQLITE_BENCH_N ?? 2_000);
const SCAN_OPS = Number(process.env.SQLITE_BENCH_SCAN_OPS ?? 50);

describe('sqlite benchmarks (raw)', { tags: ['manual'], timeout: 120_000 }, () => {
  let dir: string;
  let runtime: ManagedRuntime.ManagedRuntime<SqlClient.SqlClient, never>;

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), 'dxos-sqlite-bench-'));
    runtime = ManagedRuntime.make(layerFile(join(dir, 'bench.db')).pipe(Layer.orDie));
    await runtime.runPromise(
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        yield* sql`CREATE TABLE items (id TEXT PRIMARY KEY, value INTEGER NOT NULL, label TEXT NOT NULL)`;
        yield* sql`CREATE INDEX items_value ON items (value)`;
      }),
    );
  });

  afterAll(async () => {
    await runtime.dispose();
    rmSync(dir, { recursive: true, force: true });
  });

  test('insert, select, update, delete', async () => {
    const ids = range(N).map((i) => `item-${i}`);
    const results: BenchResult[] = [];

    results.push(
      await runBench('insert', N, (i) =>
        runtime.runPromise(
          Effect.gen(function* () {
            const sql = yield* SqlClient.SqlClient;
            yield* sql`INSERT INTO items (id, value, label) VALUES (${ids[i]}, ${i}, ${`label-${i}`})`;
          }),
        ),
      ),
    );

    results.push(
      await runBench('select (point, by primary key)', N, (i) =>
        runtime.runPromise(
          Effect.gen(function* () {
            const sql = yield* SqlClient.SqlClient;
            yield* sql`SELECT * FROM items WHERE id = ${ids[N - 1 - i]}`;
          }),
        ),
      ),
    );

    results.push(
      await runBench('select (filtered range scan)', SCAN_OPS, (i) =>
        runtime.runPromise(
          Effect.gen(function* () {
            const sql = yield* SqlClient.SqlClient;
            const lo = (i * 7) % N;
            yield* sql`SELECT * FROM items WHERE value >= ${lo} AND value < ${lo + N / 10}`;
          }),
        ),
      ),
    );

    results.push(
      await runBench('update (point, by primary key)', N, (i) =>
        runtime.runPromise(
          Effect.gen(function* () {
            const sql = yield* SqlClient.SqlClient;
            yield* sql`UPDATE items SET value = ${i + N} WHERE id = ${ids[i]}`;
          }),
        ),
      ),
    );

    results.push(
      await runBench('delete (point, by primary key)', N, (i) =>
        runtime.runPromise(
          Effect.gen(function* () {
            const sql = yield* SqlClient.SqlClient;
            yield* sql`DELETE FROM items WHERE id = ${ids[i]}`;
          }),
        ),
      ),
    );

    printResults(`raw SQLite (N=${N})`, results);
  });
});
