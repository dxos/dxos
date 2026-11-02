//
// Copyright 2026 DXOS.org
//

import * as WaSqlite from '@effect/wa-sqlite';
// oxlint-disable-next-line @dxos/rules/effect-subpath-imports
import SQLiteESMFactory from '@effect/wa-sqlite/dist/wa-sqlite.mjs';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, test } from 'vitest';

import { CACHE_SIZE_KIB, applyOpfsPragmas } from './opfs-pragmas.ts';

const require = createRequire(import.meta.url);

const readPragma = (sqlite3: ReturnType<typeof WaSqlite.Factory>, db: number, pragma: string): unknown[] => {
  const values: unknown[] = [];
  for (const stmt of sqlite3.statements(db, `PRAGMA ${pragma}`)) {
    while (sqlite3.step(stmt) === WaSqlite.SQLITE_ROW) {
      values.push(sqlite3.row(stmt)[0]);
    }
  }
  return values;
};

describe('applyOpfsPragmas', () => {
  test('sets the page-cache ceiling', async ({ expect }) => {
    const module = await SQLiteESMFactory({
      wasmBinary: readFileSync(require.resolve('@effect/wa-sqlite/dist/wa-sqlite.wasm')),
    });
    const sqlite3 = WaSqlite.Factory(module);
    const db = await sqlite3.open_v2(':memory:');
    try {
      expect(readPragma(sqlite3, db, 'cache_size')).toEqual([-2000]);
      applyOpfsPragmas(sqlite3, db);
      expect(readPragma(sqlite3, db, 'cache_size')).toEqual([-CACHE_SIZE_KIB]);
      expect(readPragma(sqlite3, db, 'temp_store')).toEqual([2]);
    } finally {
      sqlite3.close(db);
    }
  });
});
