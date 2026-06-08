//
// Copyright 2026 DXOS.org
//

import { cbor } from '@automerge/automerge-repo';

import { ProfileArchiveEntryType } from '@dxos/protocols';

/** Default OPFS SQLite database name used by Composer recovery. */
export const OPFS_SQLITE_DB_FILENAME = 'DXOS';

const SQLITE_MAGIC = new TextEncoder().encode('SQLite format 3\u0000');

/**
 * @param {Uint8Array} bytes
 * @returns {boolean}
 */
export const isValidSqliteDatabase = (bytes) => {
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

/**
 * @param {unknown} value
 * @returns {Uint8Array | undefined}
 */
export const coerceToUint8Array = (value) => {
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

/**
 * @param {string} opfsFilename
 * @param {Uint8Array} database
 * @param {{ origin?: string }} [options]
 */
export const createSqliteProfileArchive = (opfsFilename, database, options) => {
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
 * @param {import('@dxos/protocols').ProfileArchive} archive
 * @returns {Array<{ opfsFilename: string, database: Uint8Array }>}
 */
export const getSqliteProfileEntries = (archive) => {
  /** @type {Array<{ opfsFilename: string, database: Uint8Array }>} */
  const entries = [];

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

/**
 * @param {import('@dxos/protocols').ProfileArchive} archive
 * @returns {Uint8Array}
 */
export const encodeProfileArchive = (archive) => cbor.encode(archive);

/**
 * @param {Uint8Array} data
 * @returns {import('@dxos/protocols').ProfileArchive}
 */
export const decodeProfileArchive = (data) => cbor.decode(data);

/**
 * @param {string} opfsFilename
 * @param {Uint8Array} database
 * @param {{ origin?: string }} [options]
 * @returns {Uint8Array}
 */
export const wrapSqliteToProfileArchive = (opfsFilename, database, options) =>
  encodeProfileArchive(createSqliteProfileArchive(opfsFilename, database, options));

/**
 * @param {Uint8Array} archiveBytes
 * @returns {Array<{ opfsFilename: string, database: Uint8Array }>}
 */
export const unwrapProfileArchive = (archiveBytes) => getSqliteProfileEntries(decodeProfileArchive(archiveBytes));
