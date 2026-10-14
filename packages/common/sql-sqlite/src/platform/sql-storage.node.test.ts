//
// Copyright 2026 DXOS.org
//

import * as WaSqlite from '@effect/wa-sqlite';
// oxlint-disable-next-line @dxos/rules/effect-subpath-imports
import SQLiteESMFactory from '@effect/wa-sqlite/dist/wa-sqlite.mjs';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, test } from 'vitest';

import * as EffectEx from '@dxos/effect/EffectEx';

import { type Database } from '../internal/sql-storage.ts';
import { openMemory } from '../internal/wa-sqlite-storage.ts';
import * as NodeSqlStorage from './sql-storage-node.ts';

const require = createRequire(import.meta.url);

// The browser driver's database over wa-sqlite, which under node needs its wasm handed over.
const openWaSqlite = async (): Promise<Database> => {
  const module = await SQLiteESMFactory({
    wasmBinary: readFileSync(require.resolve('@effect/wa-sqlite/dist/wa-sqlite.wasm')),
  });
  return openMemory(WaSqlite.Factory(module), WaSqlite.SQLITE_ROW);
};

describe.each([
  ['node:sqlite', () => EffectEx.runPromise(NodeSqlStorage.makeMemory())],
  ['wa-sqlite', openWaSqlite],
] as const)('SqlStorage over %s', (_name, open) => {
  test('binds values and reads rows as objects and as arrays', async ({ expect }) => {
    const db = await open();
    db.exec('CREATE TABLE item (id INTEGER PRIMARY KEY, name TEXT, score REAL, data BLOB)');
    db.exec('INSERT INTO item (name, score, data) VALUES (?, ?, ?)', 'a', 1.5, new Uint8Array([1, 2]).buffer);
    db.exec('INSERT INTO item (name, score, data) VALUES (?, ?, ?)', 'b', null, null);

    const rows = db.exec('SELECT id, name, score, data FROM item ORDER BY id').toArray();
    expect(rows.map(({ id, name, score }) => ({ id, name, score }))).toEqual([
      { id: 1, name: 'a', score: 1.5 },
      { id: 2, name: 'b', score: null },
    ]);
    const data = rows[0].data;
    expect(data instanceof ArrayBuffer ? [...new Uint8Array(data)] : data).toEqual([1, 2]);
    expect([...db.exec('SELECT name, id FROM item WHERE id = ?', 2).raw()]).toEqual([['b', 2]]);
    expect(db.exec('SELECT 1 AS one WHERE 0').toArray()).toEqual([]);
    db.close();
  });

  test('transactionSync commits, rolls back on a throw, and nests', async ({ expect }) => {
    const db = await open();
    db.exec('CREATE TABLE item (name TEXT)');
    db.transactionSync(() => db.exec(`INSERT INTO item VALUES ('kept')`));
    expect(() =>
      db.transactionSync(() => {
        db.exec(`INSERT INTO item VALUES ('dropped')`);
        throw new Error('abort');
      }),
    ).toThrow('abort');
    db.transactionSync(() => {
      db.exec(`INSERT INTO item VALUES ('outer')`);
      expect(() =>
        db.transactionSync(() => {
          db.exec(`INSERT INTO item VALUES ('inner')`);
          throw new Error('abort inner');
        }),
      ).toThrow('abort inner');
    });
    expect(db.exec('SELECT name FROM item ORDER BY rowid').toArray()).toEqual([{ name: 'kept' }, { name: 'outer' }]);
    db.close();
  });
});

describe('SqlStorage.makeFile (node:sqlite)', () => {
  test('persists across reopening the file', async ({ expect, onTestFinished }) => {
    const dir = mkdtempSync(join(tmpdir(), 'sql-storage-'));
    onTestFinished(() => rmSync(dir, { recursive: true, force: true }));
    const path = join(dir, 'test.db');

    const first = await EffectEx.runPromise(NodeSqlStorage.makeFile(path));
    first.exec('CREATE TABLE item (name TEXT)');
    first.exec('INSERT INTO item VALUES (?)', 'persisted');
    first.close();

    const second = await EffectEx.runPromise(NodeSqlStorage.makeFile(path));
    expect(second.exec('SELECT name FROM item').toArray()).toEqual([{ name: 'persisted' }]);
    second.close();
  });
});
