//
// Copyright 2026 DXOS.org
//

import { type Page, type TestInfo } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

/** Values of `DX_E2E_CAPTURE_LOGS` that enable capture; `all` also captures passing tests. */
const ENABLED = new Set(['1', 'true', 'all']);

/** Bounds the read so a wedged page fails the capture rather than the hook's whole timeout. */
const READ_TIMEOUT = 30_000;

/** Caps one read well under an `IdbLogStore`'s own retention, which allows tens of megabytes. */
const DEFAULT_MAX_BYTES = 32 * 1024 * 1024;

export type ReadLogStoreOptions = {
  dbName: string;
  storeName?: string;
  maxBytes?: number;
};

/**
 * Reads a page's `IdbLogStore` database as NDJSON: the most recent `maxBytes`, prefixed with a marker
 * when older records were dropped. Unlike the console, the store survives a reload.
 */
export const readLogStore = (
  page: Page,
  { dbName, storeName = 'logs', maxBytes = DEFAULT_MAX_BYTES }: ReadLogStoreOptions,
): Promise<string> =>
  page.evaluate(
    async ({ dbName, storeName, maxBytes }) => {
      const request = indexedDB.open(dbName);
      const db = await new Promise<IDBDatabase | undefined>((resolve) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(undefined);
        // Fires only when the database does not exist: abort rather than create one from here.
        request.onupgradeneeded = () => {
          request.transaction?.abort();
          resolve(undefined);
        };
      });
      if (!db) {
        return '';
      }
      try {
        if (!db.objectStoreNames.contains(storeName)) {
          return `{"error":"no object store ${storeName}; found ${JSON.stringify([...db.objectStoreNames])}"}`;
        }
        const rows = await new Promise<{ lines?: string }[]>((resolve, reject) => {
          const query = db.transaction(storeName, 'readonly').objectStore(storeName).getAll();
          query.onsuccess = () => resolve(query.result ?? []);
          query.onerror = () => reject(query.error);
        });
        // Accumulated newest-first and capped: one string the size of the whole store can exceed the
        // engine's maximum string length.
        const kept: string[] = [];
        let bytes = 0;
        let dropped = 0;
        for (let index = rows.length - 1; index >= 0; index--) {
          const chunk = rows[index]?.lines ?? '';
          if (bytes + chunk.length > maxBytes) {
            dropped = index + 1;
            break;
          }
          kept.push(chunk);
          bytes += chunk.length + 1;
        }
        kept.reverse();
        // Chunks are stored as `batch.join('\n')` with no trailing newline, so they are rejoined with one.
        const ndjson = kept.join('\n');
        return dropped > 0 ? `{"note":"dropped ${dropped} older chunks over ${maxBytes} bytes"}\n${ndjson}` : ndjson;
      } finally {
        db.close();
      }
    },
    { dbName, storeName, maxBytes },
  );

export type DebugLogSource = {
  readDebugLog(): Promise<string>;
};

/**
 * Writes each app's debug log beside the test's other output as `<name>.log.ndjson`.
 *
 * Off unless `DX_E2E_CAPTURE_LOGS` is `1`, `true` or `all`; only `all` captures a passing test.
 * The store is flushed on a timer, so the last moments before a failure may be missing.
 * Capture never fails a test: every path is caught, and the reason is written to the file instead.
 */
export const captureDebugLogs = async (apps: Record<string, DebugLogSource>, testInfo: TestInfo): Promise<void> => {
  const mode = process.env.DX_E2E_CAPTURE_LOGS;
  if (!mode || !ENABLED.has(mode)) {
    return;
  }
  if (mode !== 'all' && testInfo.status === testInfo.expectedStatus) {
    return;
  }

  for (const [name, app] of Object.entries(apps)) {
    const path = testInfo.outputPath(`${name}.log.ndjson`);
    try {
      const ndjson = await Promise.race([
        app.readDebugLog(),
        new Promise<string>((_resolve, reject) =>
          setTimeout(() => reject(new Error(`readDebugLog timed out after ${READ_TIMEOUT}ms`)), READ_TIMEOUT),
        ),
      ]);
      // Written even when empty: an absent file cannot say whether capture ran at all.
      await writeFile(path, ndjson.length > 0 ? ndjson : '{"note":"debug log store was empty"}\n', 'utf8');
    } catch (err) {
      await writeFile(path, `{"error":${JSON.stringify(String(err))}}\n`, 'utf8').catch(() => {});
    }
  }
};
