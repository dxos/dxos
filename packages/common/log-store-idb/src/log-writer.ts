//
// Copyright 2026 DXOS.org
//

import { IdbLogStore } from './idb-log-store';
import {
  type LogWriterMessage,
  type LogWriterOptions,
  type LogWriterRequest,
  type LogWriterResponse,
} from './worker-protocol';

/**
 * Structural view of one message channel: a `MessagePort` (SharedWorker connection) or a
 * dedicated worker's global scope.
 */
type MessageEndpoint = {
  postMessage: (message: unknown) => void;
  onmessage: ((event: MessageEvent) => void) | null;
  start?: () => void;
};

/**
 * Run the log-writer worker: owns the in-memory queue, flush timer, chunked IDB writes and
 * eviction, so log persistence never depends on the sending thread's event loop turning.
 * Call once from a worker entry module; handles both dedicated (`onmessage`) and shared
 * (`onconnect`) worker scopes.
 */
export const runLogWriterWorker = (): void => {
  // One store per database — a SharedWorker consolidates every connected context onto it.
  const stores = new Map<string, IdbLogStore>();

  const getStore = (options: LogWriterOptions): IdbLogStore => {
    let store = stores.get(options.dbName);
    if (store === undefined) {
      store = new IdbLogStore(options);
      stores.set(options.dbName, store);
    }
    return store;
  };

  const handlePort = (port: MessageEndpoint): void => {
    let store: IdbLogStore | undefined;

    const respond = (response: LogWriterResponse): void => {
      try {
        port.postMessage(response);
      } catch {
        // The sending context is gone; nothing to notify.
      }
    };

    const handleRequest = async (request: Exclude<LogWriterRequest, { type: 'init' }>): Promise<void> => {
      if (store === undefined) {
        respond({ id: request.id, ok: false, error: 'log writer not initialized' });
        return;
      }
      try {
        switch (request.type) {
          case 'flush': {
            await store.flush();
            respond({ id: request.id, ok: true });
            break;
          }
          case 'export': {
            const blob = await store.exportBlob({ maxSize: request.maxSize });
            respond({ id: request.id, ok: true, result: blob });
            break;
          }
          case 'clear': {
            await store.clear();
            respond({ id: request.id, ok: true });
            break;
          }
          case 'evict': {
            await store.evictNow();
            respond({ id: request.id, ok: true });
            break;
          }
        }
      } catch (err) {
        respond({ id: request.id, ok: false, error: String(err) });
      }
    };

    port.onmessage = (event: MessageEvent<LogWriterMessage>) => {
      const data = event.data;
      // Hot path: a bare string is one pre-serialized JSONL line.
      if (typeof data === 'string') {
        store?.append(data);
        return;
      }
      if (data.type === 'init') {
        store = getStore(data.options);
        return;
      }
      void handleRequest(data);
    };
    port.start?.();
  };

  if ('onconnect' in globalThis) {
    // SharedWorker scope — one connection (port) per context.
    globalThis.onconnect = (event: MessageEvent) => {
      for (const port of event.ports) {
        handlePort(port);
      }
    };
  } else {
    // Dedicated worker scope — the global scope is the channel.
    handlePort(globalThis);
  }
};
