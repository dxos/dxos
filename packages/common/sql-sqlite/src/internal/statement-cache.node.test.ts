//
// Copyright 2026 DXOS.org
//

import * as WaSqlite from '@effect/wa-sqlite';
// oxlint-disable-next-line @dxos/rules/effect-subpath-imports
import SQLiteESMFactory from '@effect/wa-sqlite/dist/wa-sqlite.mjs';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, test } from 'vitest';

import { instantiateSqliteModule } from './sqlite-module.ts';
import { makeStatementCache } from './statement-cache.ts';

const require = createRequire(import.meta.url);

const open = async () => {
  const sqlite3 = WaSqlite.Factory(
    await instantiateSqliteModule(SQLiteESMFactory, {
      wasmBinary: readFileSync(require.resolve('@effect/wa-sqlite/dist/wa-sqlite.wasm')),
    }),
  );
  const db = await sqlite3.open_v2(':memory:');
  return { sqlite3, db };
};

describe('makeStatementCache', () => {
  test('reuses a statement with new bindings and reads every row', async ({ expect }) => {
    const { sqlite3, db } = await open();
    const statements = makeStatementCache(sqlite3, db);
    const all = (sql: string, params: (number | string)[] = []): unknown[][] => {
      const rows: unknown[][] = [];
      statements.forEach(sql, (stmt) => {
        sqlite3.bind_collection(stmt, params);
        while (sqlite3.step(stmt) === WaSqlite.SQLITE_ROW) {
          rows.push(sqlite3.row(stmt));
        }
      });
      return rows;
    };

    // A script runs in order, so a later statement can use the table an earlier one created.
    all('CREATE TABLE t (id INTEGER PRIMARY KEY, name TEXT UNIQUE); CREATE INDEX t_name ON t (name)');
    for (const name of ['a', 'b', 'c']) {
      all('INSERT INTO t (name) VALUES (?)', [name]);
    }
    expect(all('SELECT name FROM t WHERE id >= ? ORDER BY id', [2])).toEqual([['b'], ['c']]);
    expect(all('SELECT name FROM t WHERE id >= ? ORDER BY id', [3])).toEqual([['c']]);

    // A failed step leaves the cached statement usable for the next call.
    expect(() => all('INSERT INTO t (name) VALUES (?)', ['a'])).toThrow();
    all('INSERT INTO t (name) VALUES (?)', ['d']);
    expect(all('SELECT count(*) FROM t')).toEqual([[4]]);

    statements.clear();
    expect(all('SELECT count(*) FROM t')).toEqual([[4]]);
    statements.clear();
    sqlite3.close(db);
  });

  test('evicts the least recently used statement past its size', async ({ expect }) => {
    const { sqlite3, db } = await open();
    const statements = makeStatementCache(sqlite3, db, 2);
    const value = (sql: string): unknown => {
      let result: unknown;
      statements.forEach(sql, (stmt) => {
        while (sqlite3.step(stmt) === WaSqlite.SQLITE_ROW) {
          result = sqlite3.column(stmt, 0);
        }
      });
      return result;
    };
    expect(value('SELECT 1')).toBe(1);
    expect(value('SELECT 2')).toBe(2);
    expect(value('SELECT 1')).toBe(1);
    // `SELECT 2` is the oldest now; both survivors and the evicted one still answer.
    expect(value('SELECT 3')).toBe(3);
    expect(value('SELECT 2')).toBe(2);
    expect(value('SELECT 1')).toBe(1);
    statements.clear();
    sqlite3.close(db);
  });
});
