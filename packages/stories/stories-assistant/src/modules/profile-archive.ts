//
// Copyright 2026 DXOS.org
//

import {
  OPFS_SQLITE_DB_FILENAME,
  createSqliteProfileArchive,
  decodeProfileArchive,
  encodeProfileArchive,
  getSqliteProfileEntries,
} from '@dxos/client-services';
import * as OpfsPool from '@dxos/sql-sqlite/OpfsPool';
import { downloadBlob } from '@dxos/util';

/**
 * Story-side `.dxprofile` round trip over the persistent client's OPFS SQLite database — the same
 * archive Composer's recovery page reads and writes, so a profile moves between the story and the
 * app. Only the SQLite entry is carried: that is where a persistent browser client keeps everything.
 */

/** Saves the current profile as `<name>.dxprofile`; resolves false if the user cancelled. */
export const exportProfileArchive = async (name: string): Promise<boolean> => {
  const database = await OpfsPool.readDatabase(OPFS_SQLITE_DB_FILENAME);
  const bytes = encodeProfileArchive(
    createSqliteProfileArchive(OPFS_SQLITE_DB_FILENAME, database, { origin: window.location.origin }),
  );
  // Copied so the blob owns a plain ArrayBuffer rather than a view over the pool's buffer.
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const date = new Date().toISOString().slice(0, 10);
  return downloadBlob(new Blob([copy], { type: 'application/octet-stream' }), `${name}-${date}.dxprofile`);
};

/** Opens a file picker for a `.dxprofile`; resolves undefined if the user cancelled. */
export const pickProfileArchive = (): Promise<Uint8Array | undefined> =>
  new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.dxprofile,application/octet-stream';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(undefined);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
      reader.onerror = () => reject(reader.error ?? new Error('Failed to read file.'));
      reader.readAsArrayBuffer(file);
    };
    // Chrome fires no event on cancel in the general case, but `cancel` is standard now.
    input.oncancel = () => resolve(undefined);
    input.click();
  });

/**
 * Replaces the OPFS database with the archive's. The caller must have destroyed the client first:
 * the pool is written byte-for-byte underneath whatever holds it open.
 */
export const importProfileArchive = async (bytes: Uint8Array): Promise<void> => {
  const entries = getSqliteProfileEntries(decodeProfileArchive(bytes));
  const entry = entries.find((entry) => entry.opfsFilename === OPFS_SQLITE_DB_FILENAME) ?? entries[0];
  if (!entry) {
    throw new Error('Profile archive holds no SQLite database.');
  }
  await OpfsPool.writeDatabase(entry.database, OPFS_SQLITE_DB_FILENAME);
};
