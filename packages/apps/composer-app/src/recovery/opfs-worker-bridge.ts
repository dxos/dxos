//
// Copyright 2026 DXOS.org
//

import { verifyOpfsSqliteImport } from './opfs-import-verify';

type PoolWorkerInbound = ['ready', undefined, undefined] | [id: number, error: string | undefined, results: unknown];

const DEFAULT_TIMEOUT_MS = 300_000;

const createPoolWorker = (): Worker =>
  new Worker(new URL('./opfs-pool-worker.ts', import.meta.url), {
    type: 'module',
  });

const waitForWorkerMessage = (
  worker: Worker,
  predicate: (message: PoolWorkerInbound) => boolean,
  timeoutMs: number,
): Promise<PoolWorkerInbound> =>
  new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      worker.removeEventListener('message', onMessage);
      reject(new Error('OPFS pool worker operation timed out'));
    }, timeoutMs);

    const onMessage = (event: MessageEvent) => {
      const message = event.data as PoolWorkerInbound;
      if (predicate(message)) {
        clearTimeout(timeout);
        worker.removeEventListener('message', onMessage);
        resolve(message);
      }
    };

    worker.addEventListener('message', onMessage);
  });

/**
 * Import raw SQLite bytes through the native SQLite import path (deserialize + VACUUM)
 * inside a dedicated worker, then verify the persisted OPFS payload.
 */
export const importOpfsDatabaseViaWorker = async (
  database: Uint8Array,
  options?: { timeoutMs?: number },
): Promise<number> => {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const copy = new Uint8Array(database.byteLength);
  copy.set(database);

  const worker = createPoolWorker();
  let exportByteLength: number | undefined;

  try {
    await waitForWorkerMessage(worker, ([id]) => id === 'ready', timeoutMs);

    const writeId = 1;
    const writePromise = waitForWorkerMessage(worker, ([id]) => id === writeId, timeoutMs);
    worker.postMessage(['write', writeId, copy]);

    const [, error, results] = await writePromise;
    if (error) {
      throw new Error(typeof error === 'string' ? error : 'OPFS import failed');
    }
    exportByteLength = typeof results === 'number' ? results : undefined;

    worker.postMessage(['close']);
  } catch (error) {
    worker.terminate();
    throw error;
  } finally {
    worker.terminate();
  }

  return verifyOpfsSqliteImport(database, { expectedPayloadBytes: exportByteLength });
};

/** @deprecated Opening a second OPFS sqlite worker can reset pool files; prefer async OPFS read. */
export const exportOpfsDatabaseViaWorker = async (): Promise<Uint8Array> => {
  throw new Error('exportOpfsDatabaseViaWorker is disabled in recovery (use exportOpfsSqlite instead)');
};

/** @deprecated Pool worker does not emit closed. */
export const waitForOpfsWorkerClosed = async (): Promise<void> => undefined;
