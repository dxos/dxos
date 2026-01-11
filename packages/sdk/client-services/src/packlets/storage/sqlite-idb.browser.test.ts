//
// Copyright 2025 DXOS.org
//

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { sleep } from '@dxos/async';

const TEST_VFS_NAME = 'idb-batch-vfs';
const TEST_DB_NAME = 'test-database';

/**
 * Helper to delete IndexedDB database.
 */
const deleteDatabase = (name: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

/**
 * Load wa-sqlite modules dynamically.
 * This works around Vite's inability to resolve package subpaths without explicit exports.
 */
const loadWaSqlite = async () => {
  // Dynamic imports for wa-sqlite modules.
  const [SQLite, { default: SQLiteAsyncESMFactory }, { IDBBatchAtomicVFS }] = await Promise.all([
    import('@dxos/wa-sqlite'),
    import('@dxos/wa-sqlite/dist/wa-sqlite-async.mjs'),
    import('@dxos/wa-sqlite/src/examples/IDBBatchAtomicVFS.js'),
  ]);

  // Wrapper that provides custom locateFile to resolve WASM path correctly in Vite.
  const createModule = async () => {
    // Get the WASM file URL by importing it as an asset.
    const wasmUrl = new URL('@dxos/wa-sqlite/dist/wa-sqlite-async.wasm', import.meta.url).href;

    return SQLiteAsyncESMFactory({
      locateFile: (path: string) => {
        if (path.endsWith('.wasm')) {
          return wasmUrl;
        }
        return path;
      },
    });
  };

  return { SQLite, createModule, IDBBatchAtomicVFS };
};

describe('SQLite with IDBBatchAtomicVFS', () => {
  let SQLite: any;
  let IDBBatchAtomicVFS: any;
  let module: any;
  let sqlite3: any;
  let vfs: any;

  beforeEach(async () => {
    // Load wa-sqlite modules.
    console.log('');
    const modules = await loadWaSqlite();
    SQLite = modules.SQLite;
    IDBBatchAtomicVFS = modules.IDBBatchAtomicVFS;

    // Initialize async WASM module with custom locateFile.
    module = await modules.createModule();
    sqlite3 = SQLite.Factory(module);

    // Create IDBBatchAtomicVFS and register it as default.
    // The first argument is the VFS name (also used for IndexedDB database name).
    vfs = await IDBBatchAtomicVFS.create(TEST_VFS_NAME, module);
    sqlite3.vfs_register(vfs, false);
  });

  afterEach(async () => {
    // Close VFS to release resources.
    vfs?.close?.();
    // Clean up database.
    await deleteDatabase(TEST_VFS_NAME);
  });

  test.only('basic CRUD operations', async () => {
    // Debug: check VFS is ready
    console.log('VFS created:', vfs);
    console.log('VFS name:', vfs?.name);

    // Check sqlite3 is ready
    console.log('sqlite3:', sqlite3);
    console.log('sqlite3.open_v2:', typeof sqlite3?.open_v2);

    // Now try with VFS - first try without specifying VFS (use default)
    const SQLITE_OPEN_READWRITE = 0x00000002;
    const SQLITE_OPEN_CREATE = 0x00000004;

    console.log('Trying to open with default VFS...');
    const db = await sqlite3.open_v2(TEST_DB_NAME, SQLITE_OPEN_READWRITE | SQLITE_OPEN_CREATE);

    // Create table.
    await sqlite3.exec(
      db,
      `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT
      )
    `,
    );


    // Insert data.
    await sqlite3.exec(
      db,
      `
      INSERT INTO users (name, email) VALUES ('Alice', 'alice@example.com');
      INSERT INTO users (name, email) VALUES ('Bob', 'bob@example.com');
    `,
    );

    // Select data.
    const results: Array<{ id: number; name: string; email: string }> = [];
    await sqlite3.exec(db, 'SELECT * FROM users ORDER BY id', (row: any[], columns: string[]) => {
      const obj: any = {};
      columns.forEach((col, i) => {
        obj[col] = row[i];
      });
      results.push(obj);
    });

    expect(results).toHaveLength(2);
    expect(results[0].name).toBe('Alice');
    expect(results[1].name).toBe('Bob');

    // Update data.
    await sqlite3.exec(db, `UPDATE users SET email = 'alice.updated@example.com' WHERE name = 'Alice'`);

    // Verify update.
    const updatedResults: Array<{ email: string }> = [];
    await sqlite3.exec(db, `SELECT email FROM users WHERE name = 'Alice'`, (row: any[]) => {
      updatedResults.push({ email: row[0] });
    });
    expect(updatedResults[0].email).toBe('alice.updated@example.com');

    // Delete data.
    await sqlite3.exec(db, `DELETE FROM users WHERE name = 'Bob'`);

    // Verify deletion.
    const remainingResults: Array<{ name: string }> = [];
    await sqlite3.exec(db, 'SELECT name FROM users', (row: any[]) => {
      remainingResults.push({ name: row[0] });
    });
    expect(remainingResults).toHaveLength(1);
    expect(remainingResults[0].name).toBe('Alice');

    // Close database.
    await sqlite3.close(db);

    await sleep(10000000);
  });
});
