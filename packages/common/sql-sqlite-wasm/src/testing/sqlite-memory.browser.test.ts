//
// Copyright 2025 DXOS.org
//

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

// @ts-expect-error - Type declarations not compatible.
import * as WaSqlite from '@dxos/wa-sqlite';
import { SQLITE_OPEN_CREATE, SQLITE_OPEN_READWRITE } from '@dxos/wa-sqlite';
// @ts-expect-error - Type declarations not compatible.
import { SQLITE_ROW } from '@dxos/wa-sqlite';
// @ts-expect-error - Type declarations not compatible.
import SQLiteAsyncESMFactory from '@dxos/wa-sqlite/dist/wa-sqlite-async.mjs';

// Resolve WASM URL explicitly for Vite compatibility.
const wasmUrl = new URL('@effect/wa-sqlite/dist/wa-sqlite-async.wasm', import.meta.url).href;

describe('wa-sqlite in-memory database', () => {
  let sqlite3: ReturnType<typeof WaSqlite.Factory>;
  let db: number;

  beforeEach(async () => {
    // Initialize async WASM module.
    const module = await SQLiteAsyncESMFactory({
      locateFile: (path: string) => wasmUrl,
    });
    sqlite3 = WaSqlite.Factory(module);

    // Open in-memory database (no VFS needed).
    db = sqlite3.open_v2(':memory:', SQLITE_OPEN_READWRITE | SQLITE_OPEN_CREATE);
  });

  afterEach(async () => {
    if (db && sqlite3) {
      sqlite3.close(db);
      db = 0;
    }
  });

  test('basic CRUD operations', async () => {
    // Create table.
    sqlite3.exec(
      db,
      `
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT
      )
    `,
    );

    // Insert data.
    sqlite3.exec(db, `INSERT INTO users (name, email) VALUES ('Alice', 'alice@example.com')`);
    sqlite3.exec(db, `INSERT INTO users (name, email) VALUES ('Bob', 'bob@example.com')`);

    // Select data using statements API.
    const results: Array<{ id: number; name: string; email: string }> = [];
    for (const stmt of sqlite3.statements(db, 'SELECT * FROM users ORDER BY id')) {
      let columns: string[] | undefined;
      while (sqlite3.step(stmt) === SQLITE_ROW) {
        columns = columns ?? sqlite3.column_names(stmt);
        const row = sqlite3.row(stmt);
        results.push({
          id: row[0] as number,
          name: row[1] as string,
          email: row[2] as string,
        });
      }
    }

    expect(results).toHaveLength(2);
    expect(results[0].name).toBe('Alice');
    expect(results[0].email).toBe('alice@example.com');
    expect(results[1].name).toBe('Bob');
  });
});
