//
// Copyright 2026 DXOS.org
//

import { it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Migrator from 'effect/unstable/sql/Migrator';
import { readdirSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

import { SqlMigrations, SqlTransaction } from '@dxos/sql-sqlite';
import { layerMemory } from '@dxos/sql-sqlite/platform';

import agentRegistryInit from './agent-registry/0001_init.sql?raw';
import { MIGRATIONS as AGENT_REGISTRY, MIGRATIONS_TABLE as AGENT_REGISTRY_TABLE } from './agent-registry/index.ts';
import stateStoreInit from './state-store/0001_init.sql?raw';
import { MIGRATIONS as STATE_STORE, MIGRATIONS_TABLE as STATE_STORE_TABLE } from './state-store/index.ts';

const STORES = [
  { name: 'agent-registry', init: agentRegistryInit, manifest: AGENT_REGISTRY, table: AGENT_REGISTRY_TABLE },
  { name: 'state-store', init: stateStoreInit, manifest: STATE_STORE, table: STATE_STORE_TABLE },
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

describe('crawler migrations', () => {
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
        .map((entry) => entry.replace('.sql', ''))
        .sort();

      expect(onDisk).toEqual(Object.keys(manifest).sort());
    });

    // A database from before migration tracking already holds these tables and has no history, so
    // the migrator runs migration 1 against it: it must apply as a recorded no-op.
    it.effect(`${name}: applies to a legacy database, and a second run is a no-op`, () =>
      Effect.gen(function* () {
        yield* SqlMigrations.apply(init);
        expect(yield* migrate(manifest, table)).toEqual(ids(manifest));
        expect(yield* migrate(manifest, table)).toEqual([]);
      }).pipe(Effect.provide(SqlTransaction.layer.pipe(Layer.provideMerge(layerMemory))), Effect.orDie),
    );
  }

  // The seed row must tolerate re-running for the same reason the CREATEs do.
  test('state-store: the crawl_run seed is idempotent', () => {
    const seed = SqlMigrations.splitStatements(stateStoreInit).filter((statement) => /^INSERT\s/i.test(statement));
    expect(seed).toHaveLength(1);
    expect(seed[0]).toMatch(/ON CONFLICT\(id\) DO NOTHING/i);
  });
});
