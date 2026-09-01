//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Migrator from 'effect/unstable/sql/Migrator';
import { readdirSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

import { EffectEx } from '@dxos/effect';
import { SqlMigrations, SqlTransaction } from '@dxos/sql-sqlite';
import { layerMemory } from '@dxos/sql-sqlite/platform';

import init from './0001_init.sql?raw';
import { MIGRATIONS, MIGRATIONS_TABLE } from './index.ts';

/** Mirrors the store's `migrate`, so the test exercises the production configuration. */
const migrate = Migrator.make({})({ loader: Migrator.fromRecord(MIGRATIONS), table: MIGRATIONS_TABLE }).pipe(
  Effect.provide(SqlTransaction.clientLayer),
  Effect.orDie,
);

/** Derived from the manifest: hard-coded ids go stale the moment a migration is added. */
const ids = Object.keys(MIGRATIONS).map((key) => [
  Number(key.slice(0, key.indexOf('_'))),
  key.slice(key.indexOf('_') + 1),
]);

describe('rdf migrations', () => {
  // The initial migration runs against databases that already hold these tables — anything created
  // before migration tracking existed. Nothing else catches a missing clause: it does not change the
  // resulting schema, so equivalence assertions are blind to it.
  test('every CREATE in the initial migration is idempotent', () => {
    const bare = SqlMigrations.splitStatements(init)
      .filter((statement) => /^CREATE\s/i.test(statement))
      .filter(
        (statement) =>
          !/^CREATE\s+(?:VIRTUAL\s+TABLE|UNIQUE\s+INDEX|TABLE|INDEX)\s+IF\s+NOT\s+EXISTS\s/i.test(statement),
      )
      .map((statement) => statement.split('\n')[0]);

    expect(bare).toEqual([]);
  });

  // A file missing from the manifest never runs, silently — the migrator only sees what it lists.
  test('the manifest lists every migration file', () => {
    const onDisk = readdirSync(new URL('.', import.meta.url))
      .filter((entry) => entry.endsWith('.sql'))
      .map((entry) => entry.replace('.sql', ''))
      .sort();

    expect(onDisk).toEqual(Object.keys(MIGRATIONS).sort());
  });

  // A database from before migration tracking already holds these tables and has no history, so the
  // migrator runs migration 1 against it: it must apply as a recorded no-op.
  test('applies to a legacy database, and a second run is a no-op', async () => {
    await EffectEx.runPromise(
      Effect.gen(function* () {
        yield* SqlMigrations.apply(init);
        expect(yield* migrate).toEqual(ids);
        expect(yield* migrate).toEqual([]);
      }).pipe(Effect.provide(SqlTransaction.layer.pipe(Layer.provideMerge(layerMemory))), Effect.orDie),
    );
  });
});
