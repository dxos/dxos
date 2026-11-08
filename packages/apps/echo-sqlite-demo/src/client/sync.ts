//
// Copyright 2026 DXOS.org
//

import * as OpfsPool from '@dxos/sql-sqlite/OpfsPool';

import { DB_NAME, SPACE_ID } from './database.ts';

/**
 * Persistence, not replication — and the demo says so out loud.
 *
 * The whole SQLite file is the unit: push uploads it, pull replaces it. There is no merge, so the
 * last writer wins and a concurrent edit elsewhere is lost. Real convergence is the feed protocol
 * against an `echo-sqlite` instance inside the Durable Object; this is the honest intermediate.
 */

const endpoint = `/api/space/${SPACE_ID}`;

/** Uploads this device's database. The Durable Object serializes writes and stores it in R2. */
export const push = async (checkpoint: () => Promise<void>): Promise<number> => {
  // Without this the upload is a valid but empty database: the rows are still in the WAL.
  await checkpoint();
  const bytes = await OpfsPool.readDatabase(DB_NAME);
  const response = await fetch(endpoint, {
    method: 'PUT',
    headers: { 'content-type': 'application/octet-stream' },
    body: new Uint8Array(bytes),
  });
  if (!response.ok) {
    throw new Error(`Push failed: ${response.status} ${await response.text()}`);
  }
  return bytes.byteLength;
};

/**
 * Replaces this device's database with the stored one. The caller reloads afterwards: the open
 * database holds the old file, and nothing short of reopening makes it see the new bytes.
 */
export const pull = async (release: () => void): Promise<number> => {
  const response = await fetch(endpoint);
  if (response.status === 404) {
    throw new Error('Nothing stored yet — push first.');
  }
  if (!response.ok) {
    throw new Error(`Pull failed: ${response.status} ${await response.text()}`);
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!OpfsPool.isValidSqliteDatabase(bytes)) {
    throw new Error('Stored object is not a SQLite database.');
  }

  // The worker's sync access handles must go first, or `wipe` throws NoModificationAllowedError.
  release();
  // Releasing them is not synchronous with `terminate()`, so give it a few attempts.
  await retry(() => OpfsPool.wipe());

  await OpfsPool.writeDatabase(bytes, DB_NAME);
  return bytes.byteLength;
};

/** The handles are released on a turn of the event loop, not on `terminate()` returning. */
const retry = async (action: () => Promise<void>, attempts = 20): Promise<void> => {
  for (let attempt = 1; ; attempt++) {
    try {
      return await action();
    } catch (error) {
      if (attempt >= attempts) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
};
