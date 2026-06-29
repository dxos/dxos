//
// Copyright 2026 DXOS.org
//

import {
  OPFS_SQLITE_DB_FILENAME,
  decodeProfileArchive,
  getSqliteProfileEntries,
  isValidSqliteDatabase,
} from '@dxos/client-services';
import { mountDevtoolsHooks } from '@dxos/client/devtools';

import { destroyRecoveryClient } from './boot-client';
import { importOpfsSqlite } from './opfs-export';

type PickedFile = {
  bytes: Uint8Array;
  name: string;
};

const pickProfileOrSqliteFile = (): Promise<PickedFile> =>
  new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.dxprofile,.sqlite,application/x-sqlite3,application/vnd.sqlite3,application/octet-stream';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        reject(new Error('No file selected'));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve({ bytes: new Uint8Array(reader.result as ArrayBuffer), name: file.name });
      reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    };
    input.click();
  });

const resolveSqliteImport = ({ bytes, name }: PickedFile): { database: Uint8Array; opfsFilename: string } => {
  const lowerName = name.toLowerCase();

  if (lowerName.endsWith('.sqlite') || lowerName.endsWith('.db')) {
    if (!isValidSqliteDatabase(bytes)) {
      throw new Error('File is not a valid SQLite database (missing SQLite format 3 header)');
    }
    return { database: bytes, opfsFilename: OPFS_SQLITE_DB_FILENAME };
  }

  const archive = decodeProfileArchive(bytes);
  const entries = getSqliteProfileEntries(archive);
  if (entries.length === 0) {
    throw new Error('Profile archive has no valid SQLITE_DATABASE entries');
  }

  const primary = entries.find((entry) => entry.opfsFilename === OPFS_SQLITE_DB_FILENAME) ?? entries[0]!;
  return { database: primary.database, opfsFilename: primary.opfsFilename };
};

/**
 * Import decoded profile or sqlite bytes into OPFS.
 */
export const importProfileBytes = async (
  bytes: Uint8Array,
  name: string,
): Promise<{ byteLength: number; opfsFilename: string }> => {
  const { database, opfsFilename } = resolveSqliteImport({ bytes, name });

  if (opfsFilename !== OPFS_SQLITE_DB_FILENAME) {
    throw new Error(`Unsupported OPFS database name "${opfsFilename}" (expected ${OPFS_SQLITE_DB_FILENAME})`);
  }

  await destroyRecoveryClient();
  mountDevtoolsHooks({});

  const byteLength = await importOpfsSqlite(database);

  return { byteLength, opfsFilename };
};

/**
 * Fetch and import a `.dxprofile` or `.sqlite` URL (dev/test helper).
 */
export const importProfileFromUrl = async (url: string): Promise<{ byteLength: number; opfsFilename: string }> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch profile (${response.status} ${response.statusText})`);
  }

  const name = url.split('/').pop()?.split('?')[0] ?? 'profile.dxprofile';
  const bytes = new Uint8Array(await response.arrayBuffer());
  return importProfileBytes(bytes, name);
};

/**
 * Import a `.dxprofile` (SQLITE_DATABASE entry) or raw `.sqlite` file into OPFS.
 */
export const importSqliteInRecovery = async (): Promise<{ byteLength: number; opfsFilename: string }> => {
  const picked = await pickProfileOrSqliteFile();
  return importProfileBytes(picked.bytes, picked.name);
};
