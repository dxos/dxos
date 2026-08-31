//
// Copyright 2026 DXOS.org
//

import { type IdbLogStoreOptions } from './idb-log-store';

/**
 * Message protocol between `WorkerLogStore` (sender) and the log-writer worker.
 *
 * The hot path is a bare string: one pre-serialized JSONL log line, posted without an
 * envelope so the per-log sender cost stays at a single small structured clone.
 * Everything else is a request object; requests carrying an `id` receive a
 * {@link LogWriterResponse} with the same `id` on the sending port.
 */
export type LogWriterMessage = string | LogWriterRequest;

/** Engine options forwarded to the worker; serialization/filtering stay sender-side. */
export type LogWriterOptions = Omit<IdbLogStoreOptions, 'tabId' | 'logFilter'>;

export type LogWriterRequest =
  /** Binds the sending port to the store for `options.dbName`; must precede other messages. */
  | { type: 'init'; options: LogWriterOptions }
  | { type: 'flush'; id: number }
  | { type: 'export'; id: number; maxSize?: number }
  | { type: 'clear'; id: number }
  | { type: 'evict'; id: number };

export type LogWriterResponse = { id: number; ok: true; result?: Blob } | { id: number; ok: false; error: string };
