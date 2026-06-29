//
// Copyright 2026 DXOS.org
//

import { cbor } from '@automerge/automerge-repo';
import { describe, test } from 'vitest';

import { ProfileArchiveEntryType } from '@dxos/protocols';

import { decodeProfileArchive, encodeProfileArchive } from './profile-archive';
import {
  OPFS_SQLITE_DB_FILENAME,
  createSqliteProfileArchive,
  getSqliteProfileEntries,
  isValidSqliteDatabase,
} from './profile-archive-sqlite';

const sqliteHeader = (): Uint8Array => {
  const bytes = new Uint8Array(16);
  bytes.set(new TextEncoder().encode('SQLite format 3\u0000'));
  return bytes;
};

describe('profile-archive-sqlite', () => {
  test('isValidSqliteDatabase accepts SQLite header', ({ expect }) => {
    expect(isValidSqliteDatabase(sqliteHeader())).toBe(true);
    expect(isValidSqliteDatabase(new Uint8Array([1, 2, 3]))).toBe(false);
  });

  test('createSqliteProfileArchive includes optional origin in meta', ({ expect }) => {
    const archive = createSqliteProfileArchive(OPFS_SQLITE_DB_FILENAME, sqliteHeader(), {
      origin: 'main.composer.space',
    });

    expect(archive.meta.origin).toBe('main.composer.space');
    expect(archive.meta.timestamp).toBeTruthy();
  });

  test('createSqliteProfileArchive round-trips through CBOR', ({ expect }) => {
    const database = sqliteHeader();
    const archive = createSqliteProfileArchive(OPFS_SQLITE_DB_FILENAME, database);
    const decoded = decodeProfileArchive(encodeProfileArchive(archive));

    expect(decoded.storage).toHaveLength(1);
    expect(decoded.storage[0]?.type).toBe(ProfileArchiveEntryType.SQLITE_DATABASE);
    expect(getSqliteProfileEntries(decoded)).toEqual([
      { opfsFilename: OPFS_SQLITE_DB_FILENAME, database: expect.any(Uint8Array) },
    ]);
  });

  test('getSqliteProfileEntries skips invalid sqlite payloads', ({ expect }) => {
    const archive = {
      meta: { timestamp: '2026-01-01T00:00:00.000Z' },
      storage: [
        {
          type: ProfileArchiveEntryType.SQLITE_DATABASE,
          key: OPFS_SQLITE_DB_FILENAME,
          value: new Uint8Array([0, 1, 2]),
        },
      ],
    };

    expect(getSqliteProfileEntries(archive)).toEqual([]);
  });

  test('createSqliteProfileArchive rejects invalid sqlite bytes', ({ expect }) => {
    expect(() => createSqliteProfileArchive(OPFS_SQLITE_DB_FILENAME, new Uint8Array([0]))).toThrow(
      /Invalid SQLite database/,
    );
  });

  test('CBOR decode preserves sqlite entry shape', ({ expect }) => {
    const archive = createSqliteProfileArchive(OPFS_SQLITE_DB_FILENAME, sqliteHeader());
    const encoded = cbor.encode(archive);
    const decoded = cbor.decode(encoded) as ReturnType<typeof decodeProfileArchive>;

    expect(getSqliteProfileEntries(decoded)).toHaveLength(1);
  });
});
