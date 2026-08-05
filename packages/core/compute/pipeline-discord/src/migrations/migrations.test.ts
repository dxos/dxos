//
// Copyright 2026 DXOS.org
//

import { readdirSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

import { SqlMigrations } from '@dxos/sql-sqlite';

import { MIGRATIONS as EXTRACTED_QUESTION } from './extracted-question';
import extractedQuestionInit from './extracted-question/0001_init.sql?raw';
import { MIGRATIONS as MESSAGE } from './message';
import messageInit from './message/0001_init.sql?raw';
import { MIGRATIONS as QUESTION } from './question';
import questionInit from './question/0001_init.sql?raw';

const STORES = [
  { name: 'message', init: messageInit, manifest: MESSAGE },
  { name: 'question', init: questionInit, manifest: QUESTION },
  { name: 'extracted-question', init: extractedQuestionInit, manifest: EXTRACTED_QUESTION },
];

describe('pipeline-discord migrations', () => {
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
