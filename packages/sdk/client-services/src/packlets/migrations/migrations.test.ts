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

import hypercoreInit from './hypercore/0001_init.sql?raw';
import { MIGRATIONS as HYPERCORE, MIGRATIONS_TABLE as HYPERCORE_TABLE } from './hypercore/index.ts';
import metadataInit from './metadata/0001_init.sql?raw';
import { MIGRATIONS as METADATA, MIGRATIONS_TABLE as METADATA_TABLE } from './metadata/index.ts';

const STORES = [
  { name: 'hypercore', init: hypercoreInit, manifest: HYPERCORE, table: HYPERCORE_TABLE },
  { name: 'metadata', init: metadataInit, manifest: METADATA, table: METADATA_TABLE },
];

type Manifest = (typeof STORES)[number]['manifest'];

/** Mirrors each store's `migrate`, so the tests exercise the production configuration. */
const migrate = (manifest: Manifest, table: string) =>
  Migrator.make({})({ loader: Migrator.fromRecord(manifest), table }).pipe(
    Effect.provide(SqlTransaction.clientLayer),
    Effect.orDie,
  );

/** Derived from the manifest: hard-coded ids go stale the moment a migration is added. */
const ids = (manifest: Manifest) =>
  Object.keys(manifest).map((key) => [Number(key.slice(0, key.indexOf('_'))), key.slice(key.indexOf('_') + 1)]);

describe('client-services migrations', () => {
  for (const { name, init, manifest, table } of STORES) {
    // The initial migration runs against databases that already hold these tables. Nothing else
    // catches a missing clause: it does not change the resulting schema.
    test(`${name}: every CREATE in the initial migration is idempotent`, () => {
      const bare = SqlMigrations.splitStatements(init)
        .filter((statement) => /^CREATE\s/i.test(statement))
        .filter(
          (statement) =>
            !/^CREATE\s+(?:VIRTUAL\s+TABLE|UNIQUE\s+INDEX|TABLE|INDEX)\s+IF\s+NOT\s+EXISTS\s/i.test(statement),
        )
        .map((statement) => statement.split('\n')[0]);

      expect(bare).toEqual([]);
    });

    // A file missing from the manifest never runs, silently.
    test(`${name}: the manifest lists every migration file`, () => {
      const onDisk = readdirSync(new URL(`./${name}`, import.meta.url))
        .filter((entry) => entry.endsWith('.sql'))
        .map((entry) => entry.replace('.sql', ''));

      expect(onDisk.filter((file) => !(file in manifest))).toEqual([]);
    });

    // A database from before migration tracking already holds these tables and has no history, so
    // the migrator runs migration 1 against it: it must apply as a recorded no-op.
    test(`${name}: applies to a legacy database, and a second run is a no-op`, async () => {
      await EffectEx.runPromise(
        Effect.gen(function* () {
          yield* SqlMigrations.apply(init);
          expect(yield* migrate(manifest, table)).toEqual(ids(manifest));
          expect(yield* migrate(manifest, table)).toEqual([]);
        }).pipe(Effect.provide(SqlTransaction.layer.pipe(Layer.provideMerge(layerMemory))), Effect.orDie),
      );
    });
  }
});
