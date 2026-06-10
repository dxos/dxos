//
// Copyright 2026 DXOS.org
//

import { createSqliteProfileArchive, encodeProfileArchive, OPFS_SQLITE_DB_FILENAME } from '@dxos/client-services';

import { readOpfsSqliteDatabase } from './opfs-pool';
import { importOpfsDatabaseViaWorker } from './opfs-worker-bridge';

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
 * Replace the OPFS `DXOS` database via native SQLite import (deserialize + VACUUM) in a worker.
 */
export const importOpfsSqlite = async (bytes: Uint8Array): Promise<number> => importOpfsDatabaseViaWorker(bytes);

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
