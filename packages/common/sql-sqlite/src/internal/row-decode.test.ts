//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type ColumnReader, SqliteDecodeError, decodeRow } from './row-decode.ts';

const SQLITE_TEXT = 3;
const SQLITE_BLOB = 4;

const SQL = 'SELECT id, payload FROM documents WHERE id = ?';

type StubColumn = {
  name: string;
  type: number;
  bytes: number;
  read: () => unknown;
};

const captureError = (fn: () => unknown): Error => {
  try {
    fn();
  } catch (err) {
    if (err instanceof Error) {
      return err;
    }
    throw new Error(`Expected an Error, got ${typeof err}`);
  }
  throw new Error('Expected the call to throw');
};

const makeReader = (columns: StubColumn[]): ColumnReader => ({
  data_count: () => columns.length,
  column_name: (_stmt, index) => columns[index].name,
  column_type: (_stmt, index) => columns[index].type,
  column_bytes: (_stmt, index) => columns[index].bytes,
  column: (_stmt, index) => columns[index].read(),
});

describe('decodeRow', () => {
  test('a column that fails to decode names the column, its type and its size', ({ expect }) => {
    const reader = makeReader([
      { name: 'id', type: SQLITE_TEXT, bytes: 5, read: () => 'doc-1' },
      {
        name: 'payload',
        type: SQLITE_TEXT,
        bytes: 4096,
        // The shape the wasm/`TextDecoder` boundary raises in the field (DX-1298).
        read: () => {
          throw new RangeError('Bad value');
        },
      },
    ]);

    const error = captureError(() => decodeRow(reader, 1, SQL));
    expect(SqliteDecodeError.is(error)).toBe(true);
    expect(error.message).toContain('payload');
    expect(error.message).toContain('TEXT');
    expect(error.message).toContain('4096');
    expect(error.message).toContain('FROM documents');
    expect(error.cause).toBeInstanceOf(RangeError);
  });

  test('the failing value is never reported', ({ expect }) => {
    const reader = makeReader([
      {
        name: 'payload',
        type: SQLITE_BLOB,
        bytes: 3,
        read: () => {
          throw new RangeError('Bad value: hunter2');
        },
      },
    ]);

    const error = captureError(() => decodeRow(reader, 1, SQL));
    expect(error.message).toContain('payload');
    expect(error.message).not.toContain('hunter2');
  });

  test('a decoded row copies blobs off volatile wasm memory', ({ expect }) => {
    const heap = new Uint8Array([1, 2, 3, 4]);
    const reader = makeReader([
      { name: 'id', type: SQLITE_TEXT, bytes: 5, read: () => 'doc-1' },
      { name: 'payload', type: SQLITE_BLOB, bytes: 2, read: () => heap.subarray(0, 2) },
    ]);

    const row = decodeRow(reader, 1, SQL);
    heap.fill(0);
    expect(row).toEqual(['doc-1', new Uint8Array([1, 2])]);
  });
});
