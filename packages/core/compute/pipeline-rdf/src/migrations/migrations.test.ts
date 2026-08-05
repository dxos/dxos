//
// Copyright 2026 DXOS.org
//

import { readdirSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

import { SqlMigrations } from '@dxos/sql-sqlite';

import init from './0001_init.sql?raw';
import { MIGRATIONS } from './index';

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
});
