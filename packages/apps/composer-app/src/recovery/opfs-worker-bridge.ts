//
// Copyright 2026 DXOS.org
//

import { minInWorkerExportBytes, verifyOpfsSqliteImport } from './opfs-import-verify';

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
 * Write raw SQLite bytes into the OPFS pool via sync access handles in a dedicated worker.
 */
export const importOpfsDatabaseViaWorker = async (
  database: Uint8Array,
  options?: { timeoutMs?: number },
): Promise<number> => {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const copy = new Uint8Array(database.byteLength);
  copy.set(database);

  const worker = createPoolWorker();

  try {
    await waitForWorkerMessage(worker, ([id]) => id === 'ready', timeoutMs);

    const writeId = 1;
    const writePromise = waitForWorkerMessage(worker, ([id]) => id === writeId, timeoutMs);
    worker.postMessage(['write', writeId, copy]);

    const [, error] = await writePromise;
    if (error) {
      throw new Error(typeof error === 'string' ? error : 'OPFS pool write failed');
    }

    worker.postMessage(['close']);
  } catch (error) {
    worker.terminate();
    throw error;
  } finally {
    worker.terminate();
  }

  return verifyOpfsSqliteImport(database, { minExportBytes: minInWorkerExportBytes(database) });
};

/** @deprecated Opening a second OPFS sqlite worker can reset pool files; prefer async OPFS read. */
export const exportOpfsDatabaseViaWorker = async (): Promise<Uint8Array> => {
  throw new Error('exportOpfsDatabaseViaWorker is disabled in recovery (use exportOpfsSqlite instead)');
};

/** @deprecated Pool worker does not emit closed. */
export const waitForOpfsWorkerClosed = async (): Promise<void> => undefined;
