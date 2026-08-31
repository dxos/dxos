//
// Copyright 2026 DXOS.org
//

import {
  type LogConfig,
  type LogEntry,
  type LogFilter,
  type LogProcessor,
  inferEnvironmentName,
  parseFilter,
  serializeToJsonl,
  shouldLog,
} from '@dxos/log';

import { type IdbLogStoreOptions, type LogStore } from './idb-log-store';
import { type LogWriterRequest, type LogWriterResponse } from './worker-protocol';

const DEFAULT_LOG_FILTER = 'debug';
/** Bounds `close()` so a dead or wedged worker cannot hang shutdown paths (e.g. storage reset). */
const CLOSE_TIMEOUT = 5_000;

export type WorkerLogStoreOptions = IdbLogStoreOptions & {
  /**
   * The log-writer worker running {@link runLogWriterWorker} — a dedicated `Worker`, or the
   * `port` of a `SharedWorker` (preferred: it consolidates multi-tab writers and survives a
   * single tab's close). A dedicated `Worker` passed here is owned by the store and terminated
   * on `close()`; a `MessagePort` is only disconnected, leaving the shared writer running.
   */
  worker: Worker | MessagePort;
};

type PendingRequest = {
  request: LogWriterRequest;
  resolve: (result?: Blob) => void;
  reject: (error: Error) => void;
};

/**
 * Log store that forwards each pre-serialized JSONL line to a log-writer worker, which owns
 * the queue, flush timer, chunked IDB writes and eviction (see {@link runLogWriterWorker}).
 *
 * Unlike {@link IdbLogStore}, persistence does not depend on this thread's event loop:
 * `postMessage` enqueues synchronously inside the log call, and the worker keeps flushing
 * while this thread is blocked by a long synchronous task. Filtering and serialization stay
 * on the calling thread — log entries are not reliably structured-cloneable.
 */
export class WorkerLogStore implements LogStore {
  readonly #worker: Worker | MessagePort;
  readonly #tabId: string;
  readonly #filters: LogFilter[];
  readonly #pending = new Map<number, PendingRequest>();

  #nextRequestId = 1;
  #closed = false;
  #pageHideHandler: (() => void) | undefined;
  #visibilityHandler: (() => void) | undefined;

  constructor(options: WorkerLogStoreOptions) {
    const { worker, tabId, logFilter, ...engineOptions } = options;
    this.#worker = worker;
    this.#tabId = tabId ?? inferEnvironmentName();
    this.#filters = parseFilter(logFilter ?? DEFAULT_LOG_FILTER);

    // Assigning `onmessage` also starts a SharedWorker port.
    this.#worker.onmessage = (event: MessageEvent<LogWriterResponse>) => this.#handleResponse(event.data);
    this.#post({ type: 'init', options: engineOptions });

    this.#installLifecycleHandlers();
  }

  /**
   * Log processor — register via `log.addProcessor(store.processor)`.
   * Fire-and-forget: never throws and never awaits.
   */
  readonly processor: LogProcessor = (_config: LogConfig, entry: LogEntry) => {
    if (this.#closed) {
      return;
    }
    if (!shouldLog(entry, this.#filters)) {
      return;
    }
    const line = serializeToJsonl(entry, { env: this.#tabId });
    if (line === undefined) {
      return;
    }
    try {
      this.#worker.postMessage(line);
    } catch {
      // Logs must never throw out of the processor path.
    }
  };

  /**
   * Ask the worker to flush now; resolves once its IDB transaction commits.
   */
  flush(): Promise<void> {
    return this.#request({ type: 'flush', id: this.#nextRequestId++ }).then(() => undefined);
  }

  /**
   * Read all retained log lines as a JSONL string. See {@link IdbLogStore.export}.
   */
  export(options: { maxSize?: number } = {}): Promise<string> {
    return this.exportBlob(options).then((blob) => blob.text());
  }

  /**
   * Read all retained log lines as an NDJSON blob. See {@link IdbLogStore.exportBlob}.
   */
  async exportBlob(options: { maxSize?: number } = {}): Promise<Blob> {
    const blob = await this.#request({ type: 'export', id: this.#nextRequestId++, maxSize: options.maxSize });
    return blob ?? new Blob([], { type: 'application/x-ndjson' });
  }

  /**
   * Discard all stored log records.
   */
  clear(): Promise<void> {
    return this.#request({ type: 'clear', id: this.#nextRequestId++ }).then(() => undefined);
  }

  /**
   * Run an eviction sweep in the worker now. Exposed for tests.
   */
  evictNow(): Promise<void> {
    return this.#request({ type: 'evict', id: this.#nextRequestId++ }).then(() => undefined);
  }

  /**
   * Flush, then disconnect from the worker. A dedicated worker is terminated; a shared
   * worker keeps running for other connected contexts.
   */
  async close(): Promise<void> {
    if (this.#closed) {
      return;
    }
    this.#closed = true;
    this.#removeLifecycleHandlers();

    try {
      await withTimeout(this.flush(), CLOSE_TIMEOUT);
    } catch {
      // Best-effort: the worker may already be gone.
    }

    for (const pending of this.#pending.values()) {
      // Settle stragglers so callers don't hang; fire-and-forget flushes must not reject.
      if (pending.request.type === 'export') {
        pending.reject(new Error('log store closed'));
      } else {
        pending.resolve(undefined);
      }
    }
    this.#pending.clear();

    this.#worker.onmessage = null;
    if ('terminate' in this.#worker) {
      this.#worker.terminate();
    } else {
      this.#worker.close();
    }
  }

  #post(message: LogWriterRequest): void {
    this.#worker.postMessage(message);
  }

  #request(request: Exclude<LogWriterRequest, { type: 'init' }>): Promise<Blob | undefined> {
    if (this.#closed) {
      return request.type === 'export' ? Promise.reject(new Error('log store closed')) : Promise.resolve(undefined);
    }
    return new Promise<Blob | undefined>((resolve, reject) => {
      this.#pending.set(request.id, { request, resolve, reject });
      try {
        this.#post(request);
      } catch (err) {
        this.#pending.delete(request.id);
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });
  }

  #handleResponse(response: LogWriterResponse): void {
    const pending = this.#pending.get(response.id);
    if (pending === undefined) {
      return;
    }
    this.#pending.delete(response.id);
    if (response.ok) {
      pending.resolve(response.result);
    } else {
      pending.reject(new Error(response.error));
    }
  }

  #installLifecycleHandlers(): void {
    if (typeof globalThis.addEventListener !== 'function') {
      return;
    }
    const flushNow = (): void => {
      // Fire-and-forget: a reply may never arrive during teardown.
      this.flush().catch(() => {});
    };
    this.#pageHideHandler = flushNow;
    this.#visibilityHandler = () => {
      if ((globalThis as { document?: Document }).document?.visibilityState === 'hidden') {
        flushNow();
      }
    };
    globalThis.addEventListener('pagehide', this.#pageHideHandler);
    globalThis.addEventListener('visibilitychange', this.#visibilityHandler);
  }

  #removeLifecycleHandlers(): void {
    if (typeof globalThis.removeEventListener !== 'function') {
      return;
    }
    if (this.#pageHideHandler) {
      globalThis.removeEventListener('pagehide', this.#pageHideHandler);
      this.#pageHideHandler = undefined;
    }
    if (this.#visibilityHandler) {
      globalThis.removeEventListener('visibilitychange', this.#visibilityHandler);
      this.#visibilityHandler = undefined;
    }
  }
}

const withTimeout = (promise: Promise<void>, ms: number): Promise<void> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      () => {
        clearTimeout(timer);
        resolve();
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
