//
// Copyright 2026 DXOS.org
//

import { type ProfileArchive, ProfileArchiveEntryType } from '@dxos/protocols';

/** Default OPFS SQLite database name used by Composer recovery and the OPFS worker. */
export const OPFS_SQLITE_DB_FILENAME = 'DXOS' as const;

const SQLITE_MAGIC = new TextEncoder().encode('SQLite format 3\u0000');

/**
 * Returns true when `bytes` begins with the SQLite 3 file header.
 */
export const isValidSqliteDatabase = (bytes: Uint8Array): boolean => {
  if (bytes.byteLength < SQLITE_MAGIC.byteLength) {
    return false;
  }
  for (let index = 0; index < SQLITE_MAGIC.byteLength; index++) {
    if (bytes[index] !== SQLITE_MAGIC[index]) {
      return false;
    }
  }
  return true;
};

const coerceToUint8Array = (value: unknown): Uint8Array | undefined => {
  if (value instanceof Uint8Array) {
    return value;
  }
  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  }
  if (Array.isArray(value)) {
    return new Uint8Array(value);
  }
  return undefined;
};

export type SqliteProfileEntry = {
  opfsFilename: string;
  database: Uint8Array;
};

export type CreateSqliteProfileArchiveOptions = {
  /** Host where the export was created (stored in archive meta). */
  origin?: string;
};

/**
 * Build a profile archive containing a single validated SQLITE_DATABASE entry.
 */
export const createSqliteProfileArchive = (
  opfsFilename: string,
  database: Uint8Array,
  options?: CreateSqliteProfileArchiveOptions,
): ProfileArchive => {
  if (!isValidSqliteDatabase(database)) {
    throw new Error('Invalid SQLite database (missing SQLite format 3 header)');
  }

  return {
    meta: {
      timestamp: new Date().toISOString(),
      ...(options?.origin ? { origin: options.origin } : {}),
    },
    storage: [
      {
        type: ProfileArchiveEntryType.SQLITE_DATABASE,
        key: opfsFilename,
        value: database,
      },
    ],
  };
};

/**
 * Extract validated SQLITE_DATABASE entries from a profile archive.
 */
export const getSqliteProfileEntries = (archive: ProfileArchive): SqliteProfileEntry[] => {
  const entries: SqliteProfileEntry[] = [];

  for (const entry of archive.storage) {
    if (entry.type !== ProfileArchiveEntryType.SQLITE_DATABASE) {
      continue;
    }
    if (typeof entry.key !== 'string') {
      continue;
    }

    const database = coerceToUint8Array(entry.value);
    if (!database || !isValidSqliteDatabase(database)) {
      continue;
    }

    entries.push({ opfsFilename: entry.key, database });
  }

  return entries;
};
