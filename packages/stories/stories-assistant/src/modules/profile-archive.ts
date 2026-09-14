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
 * Held at the OPFS root, outside the pool directory, which the pool code treats wholesale as its own.
 */
const STAGED_IMPORT_FILENAME = 'stories-assistant-staged.dxprofile';

/**
 * Saves an archive to be imported on the next boot. The import cannot happen in place: the running
 * client's worker holds sync access handles on the pool, and `client.destroy()` does not release
 * them, so writing the pool now is refused with `NoModificationAllowedError`.
 */
export const stageProfileImport = async (bytes: Uint8Array): Promise<void> => {
  // Validated now, so a bad file is reported to the user rather than discarded on the next boot.
  selectDatabase(bytes);
  const root = await navigator.storage.getDirectory();
  const handle = await root.getFileHandle(STAGED_IMPORT_FILENAME, { create: true });
  const writable = await handle.createWritable({ keepExistingData: false });
  try {
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    await writable.write(copy);
  } finally {
    await writable.close();
  }
};

/**
 * Writes a staged archive into the pool and removes it. Must run before the client starts, which is
 * the only time no worker holds the pool. The staged file is removed even when the write fails, so
 * one bad import cannot fail every later boot.
 */
export const applyStagedProfileImport = async (): Promise<void> => {
  const root = await navigator.storage.getDirectory();
  const handle = await root.getFileHandle(STAGED_IMPORT_FILENAME).catch(() => undefined);
  if (!handle) {
    return;
  }
  try {
    const bytes = new Uint8Array(await (await handle.getFile()).arrayBuffer());
    await OpfsPool.writeDatabase(selectDatabase(bytes), OPFS_SQLITE_DB_FILENAME);
  } finally {
    await root.removeEntry(STAGED_IMPORT_FILENAME);
  }
};

/** The archive's main SQLite database, the one a persistent browser client opens. */
const selectDatabase = (bytes: Uint8Array): Uint8Array => {
  const entries = getSqliteProfileEntries(decodeProfileArchive(bytes));
  const entry = entries.find((entry) => entry.opfsFilename === OPFS_SQLITE_DB_FILENAME) ?? entries[0];
  if (!entry) {
    throw new Error('Profile archive holds no SQLite database.');
  }
  return entry.database;
};
