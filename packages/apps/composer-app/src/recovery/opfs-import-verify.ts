//
// Copyright 2026 DXOS.org
//

import { isValidSqliteDatabase } from '@dxos/client-services';

import { readOpfsSqliteDatabase } from './opfs-pool';

/** Cap on the size floor so very large profiles don't demand impossible minimums. */
const MIN_PAYLOAD_BYTES_CAP = 1_000_000;

/**
 * Minimum acceptable OPFS payload size for a given source file.
 * Import goes through deserialize + VACUUM, which can legitimately shrink the database
 * (free pages are dropped), so only enforce a conservative floor — never more than the
 * source size itself.
 */
export const minImportedPayloadBytes = (sourceBytes: Uint8Array): number =>
  Math.min(Math.ceil(sourceBytes.byteLength / 2), MIN_PAYLOAD_BYTES_CAP);

/**
 * Verify OPFS holds the imported SQLite database (async read — do not open a second OPFS worker).
 * @param expectedPayloadBytes Authoritative size reported by the in-worker post-import export.
 */
export const verifyOpfsSqliteImport = async (
  sourceBytes: Uint8Array,
  options?: { expectedPayloadBytes?: number },
): Promise<number> => {
  const payload = await readOpfsSqliteDatabase();
  if (!isValidSqliteDatabase(payload)) {
    throw new Error('Imported OPFS database has invalid SQLite header');
  }

  if (options?.expectedPayloadBytes !== undefined && payload.byteLength < options.expectedPayloadBytes) {
    throw new Error(
      `OPFS payload smaller than in-worker export (OPFS ${payload.byteLength.toLocaleString()}, export ${options.expectedPayloadBytes.toLocaleString()})`,
    );
  }

  const minPayloadBytes = minImportedPayloadBytes(sourceBytes);
  if (payload.byteLength < minPayloadBytes) {
    throw new Error(
      `OPFS import too small (source file ${sourceBytes.byteLength.toLocaleString()}, OPFS payload ${payload.byteLength.toLocaleString()}, min ${minPayloadBytes.toLocaleString()})`,
    );
  }

  return payload.byteLength;
};
