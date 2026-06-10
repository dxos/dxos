//
// Copyright 2026 DXOS.org
//

import { isValidSqliteDatabase } from '@dxos/client-services';

import { readOpfsSqliteDatabase } from './opfs-pool';

/** Compare a sample of bytes at both ends to detect truncated or partial writes cheaply. */
const SAMPLE_BYTES = 4096;

const sampleMismatch = (source: Uint8Array, payload: Uint8Array): boolean => {
  const head = Math.min(SAMPLE_BYTES, source.byteLength);
  for (let index = 0; index < head; index++) {
    if (source[index] !== payload[index]) {
      return true;
    }
  }
  const tailStart = Math.max(0, source.byteLength - SAMPLE_BYTES);
  for (let index = tailStart; index < source.byteLength; index++) {
    if (source[index] !== payload[index]) {
      return true;
    }
  }
  return false;
};

/**
 * Verify OPFS holds the imported SQLite database (async read — no SQLite, no worker).
 * Import is a raw byte copy, so the payload must match the source exactly.
 */
export const verifyOpfsSqliteImport = async (sourceBytes: Uint8Array): Promise<number> => {
  const payload = await readOpfsSqliteDatabase();
  if (!isValidSqliteDatabase(payload)) {
    throw new Error('Imported OPFS database has invalid SQLite header');
  }

  if (payload.byteLength !== sourceBytes.byteLength) {
    throw new Error(
      `OPFS payload size mismatch (source ${sourceBytes.byteLength.toLocaleString()}, OPFS ${payload.byteLength.toLocaleString()})`,
    );
  }

  if (sampleMismatch(sourceBytes, payload)) {
    throw new Error('OPFS payload differs from imported source bytes');
  }

  return payload.byteLength;
};
