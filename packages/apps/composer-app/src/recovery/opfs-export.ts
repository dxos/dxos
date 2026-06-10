//
// Copyright 2026 DXOS.org
//

import { createSqliteProfileArchive, encodeProfileArchive, OPFS_SQLITE_DB_FILENAME } from '@dxos/client-services';

import { verifyOpfsSqliteImport } from './opfs-import-verify';
import { readOpfsSqliteDatabase, writeOpfsSqliteDatabase } from './opfs-pool';

const DB_NAME = OPFS_SQLITE_DB_FILENAME;

/**
 * Read the OPFS `DXOS` SQLite payload directly (no SQLite worker).
 */
export const exportOpfsSqlite = async (): Promise<Uint8Array> => readOpfsSqliteDatabase(DB_NAME);

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
  await writeOpfsSqliteDatabase(bytes, DB_NAME);
  return verifyOpfsSqliteImport(bytes);
};

/** Trigger a browser download of a `.dxprofile` archive. */
export const downloadProfileArchiveExport = (bytes: Uint8Array, filename?: string) => {
  const date = new Date().toISOString().slice(0, 10);
  downloadBinaryExport(bytes, filename ?? `composer-${date}.dxprofile`, 'application/octet-stream');
};

/** Trigger a browser download of raw SQLite bytes. */
export const downloadSqliteExport = (bytes: Uint8Array, filename = `${DB_NAME}.sqlite`) => {
  downloadBinaryExport(bytes, filename, 'application/x-sqlite3');
};

const downloadBinaryExport = (bytes: Uint8Array, filename: string, mimeType: string) => {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const blob = new Blob([copy], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};
