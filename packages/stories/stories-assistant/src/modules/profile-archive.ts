//
// Copyright 2026 DXOS.org
//

import { Storage } from '@dxos/client-services';
import { withPersistentStorage } from '@dxos/client/testing';
import { type Client } from '@dxos/react-client';
import * as OpfsPool from '@dxos/sql-sqlite/OpfsPool';
import { downloadBlob } from '@dxos/util';

/**
 * Story-side `.dxprofile` round trip over the persistent client's OPFS SQLite database — the same
 * archive Composer's recovery page reads and writes, so a profile moves between the story and the
 * app. Only the SQLite entry is carried: that is where a persistent browser client keeps everything.
 */

/**
 * Reads the database through the running client, which checkpoints the WAL before serializing.
 * Recovery can read the pool file directly because it boots no client; here one is live, so a raw
 * read would strand every commit still sitting in the `-wal` sidecar and export a stale profile.
 */
const readDatabase = async (client: Client): Promise<Uint8Array> => {
  const devtools = client.services.services.DevtoolsHost;
  if (!devtools) {
    throw new Error('DevtoolsHost is not available; cannot export a consistent database.');
  }
  const { data } = await devtools.exportSqliteDatabase();
  return data;
};

/** Saves the current profile as `<name>.dxprofile`; resolves false if the user cancelled. */
export const exportProfileArchive = async (client: Client, name: string): Promise<boolean> => {
  const database = await readDatabase(client);
  const bytes = Storage.encodeProfileArchive(
    Storage.createSqliteProfileArchive(Storage.OPFS_SQLITE_DB_FILENAME, database, { origin: window.location.origin }),
  );
  // Copied so the blob owns a plain ArrayBuffer rather than a view into the encoder's buffer.
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

/** Discards the staged archive, tolerating a concurrent caller having got there first. */
const removeStagedImport = async (root: FileSystemDirectoryHandle): Promise<void> => {
  try {
    await root.removeEntry(STAGED_IMPORT_FILENAME);
  } catch (error) {
    if (!(error instanceof DOMException) || error.name !== 'NotFoundError') {
      throw error;
    }
  }
};

/**
 * Shared by every concurrent caller in this document. React runs a mount effect twice under
 * StrictMode, so the story calls this twice: without the guard the second call reads a handle the
 * first has already consumed and fails on it, and the reported failure is the import's own.
 */
let applying: Promise<void> | undefined;

/**
 * Writes a staged archive into the pool and removes it. Must run before this tab's client starts,
 * and under the storage lock: the outgoing document's worker is torn down asynchronously, so a
 * reload alone does not free the pool's sync access handles (see {@link withPersistentStorage}).
 */
export const applyStagedProfileImport = async (): Promise<void> => {
  applying ??= applyStagedProfileImportOnce().finally(() => {
    applying = undefined;
  });
  return applying;
};

const applyStagedProfileImportOnce = async (): Promise<void> => {
  const root = await navigator.storage.getDirectory();
  // Fast path, so an ordinary boot neither takes the storage lock nor displaces anyone else's
  // worker. The reading that decides anything is the one under the lock below.
  if (!(await root.getFileHandle(STAGED_IMPORT_FILENAME).catch(() => undefined))) {
    return;
  }

  await withPersistentStorage(async () => {
    // Re-read while holding the lock. Two documents booting together both see the staged file, and
    // reading it outside would let the second write its stale snapshot over everything the first
    // one's client has already done since applying the very same archive.
    const handle = await root.getFileHandle(STAGED_IMPORT_FILENAME).catch(() => undefined);
    if (!handle) {
      return;
    }

    const bytes = new Uint8Array(await (await handle.getFile()).arrayBuffer());
    let database: Uint8Array;
    try {
      database = selectDatabase(bytes);
    } catch (error) {
      // Unreadable bytes would fail identically on every later boot, so drop them rather than retry.
      await removeStagedImport(root);
      throw error;
    }

    // Removed under the lock too, so a failure to take it leaves the import staged for the next
    // reload rather than discarding a profile the user picked.
    await OpfsPool.writeDatabase(database, Storage.OPFS_SQLITE_DB_FILENAME);
    await removeStagedImport(root);
  });
};

/** The archive's main SQLite database, the one a persistent browser client opens. */
const selectDatabase = (bytes: Uint8Array): Uint8Array => {
  const entries = Storage.getSqliteProfileEntries(Storage.decodeProfileArchive(bytes));
  const entry = entries.find((entry) => entry.opfsFilename === Storage.OPFS_SQLITE_DB_FILENAME) ?? entries[0];
  if (!entry) {
    throw new Error('Profile archive holds no SQLite database.');
  }
  return entry.database;
};
