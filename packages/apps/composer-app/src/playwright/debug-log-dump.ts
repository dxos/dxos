//
// Copyright 2026 DXOS.org
//

// #region DEBUG
// Scaffolding for the DX-1152 invitation-stall investigation. Composer's observability worker
// already persists debug-level entries (page AND worker realms) as NDJSON chunks in IndexedDB, so a
// failing e2e peer can be dumped without rebuilding the bundle or raising any log filter.
import { type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const LOG_STORE_DB_NAME = 'composer-logs';
const LOG_STORE_NAME = 'logs';

export const DEBUG_LOG_DIR = join(process.cwd(), '../../../test-results/debug-logs');

/**
 * Read the peer's persisted NDJSON log out of IndexedDB and write it next to the run's artifacts.
 * Never throws: a dump failure must not displace the test failure being investigated.
 */
export const dumpBrowserLogs = async (page: Page | undefined, label: string): Promise<void> => {
  if (!page) {
    return;
  }
  try {
    const ndjson = await page.evaluate(
      async ({ dbName, storeName }) => {
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open(dbName);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        if (!db.objectStoreNames.contains(storeName)) {
          db.close();
          return '';
        }
        // Each stored row is a `LogChunk` whose `lines` field holds newline-joined NDJSON records.
        const chunks = await new Promise<string[]>((resolve, reject) => {
          const request = db.transaction(storeName, 'readonly').objectStore(storeName).getAll();
          request.onsuccess = () => resolve((request.result as { lines: string }[]).map((row) => row.lines));
          request.onerror = () => reject(request.error);
        });
        db.close();
        return chunks.join('\n');
      },
      { dbName: LOG_STORE_DB_NAME, storeName: LOG_STORE_NAME },
    );

    const file = join(DEBUG_LOG_DIR, `${label.replace(/[^a-z0-9]+/gi, '-')}.ndjson`);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, ndjson);
    // eslint-disable-next-line no-console
    console.log(`[DEBUG DUMP] ${file} (${ndjson.length} bytes)`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.log(`[DEBUG DUMP] failed for ${label}:`, err);
  }
};
// #endregion DEBUG
