//
// Copyright 2026 DXOS.org
//

const DB_NAME = 'DXOS';

type WorkerReply = [id: number, error: string | undefined, payload: unknown];

/**
 * Opens the OPFS SQLite worker only (no DXOS client, sync, or plugins) and exports `DXOS` as bytes.
 */
export const exportOpfsSqlite = async (): Promise<Uint8Array> => {
  const worker = new Worker(new URL('@dxos/client/opfs-worker', import.meta.url), { type: 'module' });

  try {
    await waitForReady(worker);
    const [, error, payload] = await send(worker, ['export', nextMessageId()]);
    if (error) {
      throw new Error(error);
    }
    if (!(payload instanceof Uint8Array)) {
      throw new Error('Export did not return bytes');
    }
    return payload;
  } finally {
    worker.postMessage(['close']);
    worker.terminate();
  }
};

let messageSeq = 0;
const nextMessageId = () => ++messageSeq;

const waitForReady = (worker: Worker): Promise<void> =>
  new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('OPFS worker ready timeout')), 30_000);
    const onMessage = (event: MessageEvent<WorkerReply | ['ready', undefined, undefined]>) => {
      if (event.data[0] === 'ready') {
        clearTimeout(timeout);
        worker.removeEventListener('message', onMessage);
        resolve();
      }
    };
    worker.addEventListener('message', onMessage);
    worker.addEventListener('error', (event) => {
      clearTimeout(timeout);
      reject(event.error ?? new Error('OPFS worker error'));
    });
  });

const send = (worker: Worker, message: unknown): Promise<WorkerReply> =>
  new Promise((resolve, reject) => {
    const id = Array.isArray(message) && typeof message[1] === 'number' ? message[1] : -1;
    const timeout = setTimeout(() => reject(new Error('OPFS worker response timeout')), 120_000);
    const onMessage = (event: MessageEvent<WorkerReply>) => {
      const [replyId] = event.data;
      if (replyId !== id) {
        return;
      }
      clearTimeout(timeout);
      worker.removeEventListener('message', onMessage);
      resolve(event.data);
    };
    worker.addEventListener('message', onMessage);
    worker.postMessage(message);
  });

/** Trigger a browser download of raw SQLite bytes. */
export const downloadSqliteExport = (bytes: Uint8Array, filename = `${DB_NAME}.sqlite`) => {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const blob = new Blob([copy], { type: 'application/x-sqlite3' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};
