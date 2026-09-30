//
// Copyright 2026 DXOS.org
//

import * as WaSqlite from '@effect/wa-sqlite';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { afterEach, describe, test } from 'vitest';

import { type LogEntry, LogLevel, type LogProcessor, log } from '@dxos/log';
// @ts-expect-error - No type declarations for this module.
import SQLiteESMFactory from '@dxos/wa-sqlite/dist/wa-sqlite.mjs';

import { readRow } from './row-decode.ts';

const require = createRequire(import.meta.url);

/** Refuses any string longer than the column name and the short value, standing in for a decoder fault. */
class RefusingTextDecoder extends TextDecoder {
  override decode(input?: AllowSharedBufferSource, options?: TextDecodeOptions): string {
    if ((input?.byteLength ?? 0) > 100) {
      throw new RangeError('Bad value');
    }
    return super.decode(input, options);
  }
}

const NativeTextDecoder = globalThis.TextDecoder;

describe('readRow', () => {
  afterEach(() => {
    globalThis.TextDecoder = NativeTextDecoder;
  });

  test('a failed decode logs which column and storage class raised it, then rethrows', async ({ expect }) => {
    globalThis.TextDecoder = RefusingTextDecoder;
    const sqlite3 = WaSqlite.Factory(
      await SQLiteESMFactory({ wasmBinary: readFileSync(require.resolve('@dxos/wa-sqlite/dist/wa-sqlite.wasm')) }),
    );
    const db = await sqlite3.open_v2(':memory:');
    await sqlite3.exec(db, `CREATE TABLE doc (id INTEGER, title TEXT, body TEXT)`);
    await sqlite3.exec(db, `INSERT INTO doc VALUES (1, 'short', '${'x'.repeat(200)}')`);

    const sql = 'SELECT id, title, body FROM doc';
    const entries: LogEntry[] = [];
    const processor: LogProcessor = (_config, entry) => {
      entries.push(entry);
    };
    const remove = log.addProcessor(processor);
    try {
      for await (const stmt of sqlite3.statements(db, sql)) {
        expect(await sqlite3.step(stmt)).toBe(WaSqlite.SQLITE_ROW);
        expect(() => readRow(sqlite3, stmt, sql, undefined)).toThrow(RangeError);
      }
    } finally {
      remove();
      await sqlite3.close(db);
    }

    const warning = entries.find((entry) => entry.message === 'sqlite row decode failed');
    expect(warning?.level).toBe(LogLevel.WARN);
    expect(warning?.context).toMatchObject({
      sql,
      columns: [
        { index: 0, name: 'id', storageClass: 'integer', bytes: 1, decodes: true },
        { index: 1, name: 'title', storageClass: 'text', bytes: 5, decodes: true },
        { index: 2, name: 'body', storageClass: 'text', bytes: 200, decodes: false },
      ],
    });
  });
});
