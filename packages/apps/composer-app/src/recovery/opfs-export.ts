//
// Copyright 2026 DXOS.org
//

import { OPFS_SQLITE_DB_FILENAME, createSqliteProfileArchive, encodeProfileArchive } from '@dxos/client-services';
import * as OpfsPool from '@dxos/sql-sqlite/OpfsPool';
import { downloadBlob } from '@dxos/util';

import { verifyOpfsSqliteImport } from './opfs-import-verify';

const DB_NAME = OPFS_SQLITE_DB_FILENAME;

/**
 * Read the OPFS `DXOS` SQLite payload directly (no SQLite worker).
 */
export const exportOpfsSqlite = async (): Promise<Uint8Array> => OpfsPool.readDatabase(DB_NAME);

/**
 * Export OPFS SQLite as a CBOR `.dxprofile` archive with a SQLITE_DATABASE entry.
 */
export const exportOpfsProfileArchive = async (options?: { origin?: string }): Promise<Uint8Array> => {
  const database = await exportOpfsSqlite();
  return encodeProfileArchive(createSqliteProfileArchive(DB_NAME, database, options));
};

/**
 * Replace the OPFS `DXOS` database by writing raw SQLite bytes into the pool file.
 * SQLite is deliberately not involved: `sqlite3_deserialize` cannot persist to a VFS and
 * wa-sqlite exposes no backup API, so a direct byte-exact pool write is the reliable path.
 */
export const importOpfsSqlite = async (bytes: Uint8Array): Promise<number> => {
  await OpfsPool.writeDatabase(bytes, DB_NAME);
  return verifyOpfsSqliteImport(bytes);
};

/** Save a `.dxprofile` archive to disk. Resolves false if the user cancelled. */
export const downloadProfileArchiveExport = (bytes: Uint8Array, filename?: string): Promise<boolean> => {
  const date = new Date().toISOString().slice(0, 10);
  return downloadBinaryExport(bytes, filename ?? `composer-${date}.dxprofile`, 'application/octet-stream');
};

/** Save raw SQLite bytes to disk. Resolves false if the user cancelled. */
export const downloadSqliteExport = (bytes: Uint8Array, filename = `${DB_NAME}.sqlite`): Promise<boolean> => {
  return downloadBinaryExport(bytes, filename, 'application/x-sqlite3');
};

const downloadBinaryExport = (bytes: Uint8Array, filename: string, mimeType: string): Promise<boolean> => {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return downloadBlob(new Blob([copy], { type: mimeType }), filename);
};
