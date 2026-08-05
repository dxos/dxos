//
// Copyright 2026 DXOS.org
//

import { readdirSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

import { SqlMigrations } from '@dxos/sql-sqlite';

import { MIGRATIONS as AGENT_REGISTRY } from './agent-registry';
import agentRegistryInit from './agent-registry/0001_init.sql?raw';
import { MIGRATIONS as STATE_STORE } from './state-store';
import stateStoreInit from './state-store/0001_init.sql?raw';

const STORES = [
  { name: 'agent-registry', init: agentRegistryInit, manifest: AGENT_REGISTRY },
  { name: 'state-store', init: stateStoreInit, manifest: STATE_STORE },
];

describe('crawler migrations', () => {
  for (const { name, init, manifest } of STORES) {
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
  }

  // The seed row must tolerate re-running for the same reason the CREATEs do.
  test('state-store: the crawl_run seed is idempotent', () => {
    const seed = SqlMigrations.splitStatements(stateStoreInit).filter((statement) => /^INSERT\s/i.test(statement));
    expect(seed).toHaveLength(1);
    expect(seed[0]).toMatch(/ON CONFLICT\(id\) DO NOTHING/i);
  });
});
