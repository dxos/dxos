//
// Copyright 2026 DXOS.org
//

import { isValidSqliteDatabase } from '@dxos/client-services';

import { readOpfsSqliteDatabase } from './opfs-pool';

/** Typical empty Composer OPFS database after migrations. */
const EMPTY_OPFS_DB_BYTES = 512_000;

/** Minimum exported bytes for a profile that was large on disk. */
const LARGE_PROFILE_MIN_EXPORT_BYTES = 1_000_000;

/**
 * Minimum in-worker export size after deserialize for a given source file.
 */
export const minInWorkerExportBytes = (sourceBytes: Uint8Array): number =>
  sourceBytes.byteLength > EMPTY_OPFS_DB_BYTES ? LARGE_PROFILE_MIN_EXPORT_BYTES : sourceBytes.byteLength;

/**
 * Verify OPFS holds an imported SQLite database (async read — do not open a second OPFS worker).
 */
export const verifyOpfsSqliteImport = async (
  sourceBytes: Uint8Array,
  options?: { minExportBytes?: number },
): Promise<number> => {
  const payload = await readOpfsSqliteDatabase();
  if (!isValidSqliteDatabase(payload)) {
    throw new Error('Imported OPFS database has invalid SQLite header');
  }

  const minExportBytes =
    options?.minExportBytes ??
    (sourceBytes.byteLength > EMPTY_OPFS_DB_BYTES ? LARGE_PROFILE_MIN_EXPORT_BYTES : sourceBytes.byteLength);

  if (payload.byteLength < minExportBytes) {
    throw new Error(
      `OPFS import too small (source file ${sourceBytes.byteLength.toLocaleString()}, OPFS payload ${payload.byteLength.toLocaleString()}, min ${minExportBytes.toLocaleString()})`,
    );
  }

  return payload.byteLength;
};
