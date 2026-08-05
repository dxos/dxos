//
// Copyright 2026 DXOS.org
//

import { readdirSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

import { SqlMigrations } from '@dxos/sql-sqlite';

import { MIGRATIONS as CHUNKS } from './chunks';
import chunksInit from './chunks/0001_init.sql?raw';
import { MIGRATIONS as HEADS } from './heads';
import headsInit from './heads/0001_init.sql?raw';
import { MIGRATIONS as SPACE_STATE } from './space-state';
import spaceStateInit from './space-state/0001_init.sql?raw';

const STORES = [
  { name: 'chunks', init: chunksInit, manifest: CHUNKS },
  { name: 'heads', init: headsInit, manifest: HEADS },
  { name: 'space-state', init: spaceStateInit, manifest: SPACE_STATE },
];

describe('echo-host migrations', () => {
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
