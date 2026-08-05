//
// Copyright 2026 DXOS.org
//

import { readdirSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

import { SqlMigrations } from '@dxos/sql-sqlite';

import { MIGRATIONS as HYPERCORE } from './hypercore';
import hypercoreInit from './hypercore/0001_init.sql?raw';
import { MIGRATIONS as METADATA } from './metadata';
import metadataInit from './metadata/0001_init.sql?raw';

const STORES = [
  { name: 'hypercore', init: hypercoreInit, manifest: HYPERCORE },
  { name: 'metadata', init: metadataInit, manifest: METADATA },
];

describe('client-services migrations', () => {
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
        .map((entry) => entry.replace('.sql', ''));

      expect(onDisk.filter((file) => !(file in manifest))).toEqual([]);
    });
  }
});
