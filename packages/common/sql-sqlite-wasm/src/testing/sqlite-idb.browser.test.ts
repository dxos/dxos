//
// Copyright 2025 DXOS.org
//

import { afterEach, describe, expect, test } from 'vitest';

// @ts-expect-error - Type declarations not compatible.
import * as WaSqlite from '@dxos/wa-sqlite';
// @ts-expect-error - Type declarations not compatible.
import { SQLITE_ROW } from '@dxos/wa-sqlite';
// @ts-expect-error - No type declarations for this module.
import SQLiteAsyncESMFactory from '@dxos/wa-sqlite/dist/wa-sqlite-async.mjs';
// @ts-expect-error - No type declarations for this module.
import { IDBBatchAtomicVFS } from '@dxos/wa-sqlite/src/examples/IDBBatchAtomicVFS.js';

const TEST_VFS_NAME = 'test-idb-vfs';

// Resolve WASM URL explicitly for Vite compatibility.
const wasmUrl = new URL('@dxos/wa-sqlite/dist/wa-sqlite-async.wasm', import.meta.url).href;

/**
 * Delete IndexedDB database.
 */
const deleteDatabase = (name: string): Promise<void> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });

describe('wa-sqlite with IDBBatchAtomicVFS', () => {
  let sqlite3: ReturnType<typeof WaSqlite.Factory>;
  let vfs: any;
  let db: number;

  afterEach(async () => {
    // Close database.
    if (db && sqlite3) {
      await sqlite3.close(db);
      db = 0;
    }
    // Note: Skip vfs.close() - it fails with "Cannot read properties of undefined (reading 'flags')".
    // Just clean up IndexedDB.
    await deleteDatabase(TEST_VFS_NAME).catch(() => {});
  });

  test.only('basic CRUD operations', async () => {
    // Initialize async WASM module.
    console.log(1);
    const module = await SQLiteAsyncESMFactory({
      locateFile: (path: string) => (path.endsWith('.wasm') ? wasmUrl : path),
    });
    sqlite3 = WaSqlite.Factory(module);
    console.log(2);
    // Create and register IDBBatchAtomicVFS.
    vfs = IDBBatchAtomicVFS.create('demo', module, { lockPolicy: 'shared+hint' });
    console.log(3);
    console.log('vfs methods:', Object.keys(vfs));
    console.log('vfs.name:', vfs.name);
    const reg = sqlite3.vfs_register(vfs, true);
    console.log(4, { reg });

    try {
      // Open database.
      db = await sqlite3.open_v2('foo');
      console.log(5, { db });
    } catch (error) {
      console.error(error);
      throw error;
    }

    console.log(6, '___START___');
    // Create table.
    await sqlite3.exec(
      db,
      `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT
      )
    `,
    );
    console.log(7, '___CREATE TABLE___');
    // Insert data.
    await sqlite3.exec(db, `INSERT INTO users (name, email) VALUES ('Alice', 'alice@example.com')`);
    await sqlite3.exec(db, `INSERT INTO users (name, email) VALUES ('Bob', 'bob@example.com')`);
    console.log(8, '___INSERT DATA___');
    // Select data using statements API.
    const results: Array<{ id: number; name: string; email: string }> = [];
    for await (const stmt of sqlite3.statements(db, 'SELECT * FROM users ORDER BY id')) {
      let columns: string[] | undefined;
      while ((await sqlite3.step(stmt)) === SQLITE_ROW) {
        columns = columns ?? sqlite3.column_names(stmt);
        const row = sqlite3.row(stmt);
        results.push({
          id: row[0] as number,
          name: row[1] as string,
          email: row[2] as string,
        });
      }
    }
    console.log(9, '___SELECT DATA___');
    console.log(10, { results });
    console.log(11, '___EXPECTATIONS___');
    expect(results).toHaveLength(2);
    console.log(12, '___EXPECTATIONS___');
    expect(results[0].name).toBe('Alice');
    expect(results[0].email).toBe('alice@example.com');
    expect(results[1].name).toBe('Bob');
  });
});
