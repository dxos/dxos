//
// Copyright 2026 DXOS.org
//

import {
  type LogConfig,
  type LogEntry,
  type LogFilter,
  type LogLevel,
  type LogProcessor,
  type TraceContext,
  inferEnvironmentName,
  parseFilter,
  serializeToJsonl,
  shouldLog,
} from '@dxos/log';
import type * as OtelLogSink from '@dxos/observability/OtelLogSink';
import type * as OtelMetricsSink from '@dxos/observability/OtelMetricsSink';
import type * as OtelSpanSink from '@dxos/observability/OtelSpanSink';

const DEFAULT_LOG_FILTER = 'debug';

/**
 * Lines posted together at most: a thread stuck in a long synchronous task still hands the worker
 * all but the last partial batch, while a burst costs one `postMessage` per batch, not per line.
 */
export const MAX_LINES_PER_BATCH = 64;

/** One pre-serialized JSONL log line. */
export type SerializedLogLine = string;

/** The lines logged since the last batch, in order. */
export type LogBatch = { type: 'log-batch'; lines: SerializedLogLine[] };

export type ObservabilityWorkerMessage =
  | LogBatch
  | { type: 'flush' }
  | OtelLogSink.Message
  | OtelMetricsSink.Message
  | OtelSpanSink.Message;

export type WorkerLogProcessorOptions = {
  worker: Pick<Worker, 'postMessage'>;
  /** Identifier embedded in every record's `i` field. Defaults to {@link inferEnvironmentName}. */
  tabId?: string;
  /** Same syntax as `DX_LOG` — entries below the minimum level are not sent. Default `debug`. */
  logFilter?: string | string[] | LogLevel;
  /** The span active on this thread, read per entry so the worker can link the record to its trace. */
  traceContext?: () => TraceContext | undefined;
};

/**
 * Log processor that forwards pre-serialized JSONL lines to the observability worker, which owns
 * the queue, flush timer, IDB writes and eviction. Lines are posted in batches: at the end of the
 * task that logged them, or as soon as {@link MAX_LINES_PER_BATCH} accumulate, so the worker keeps
 * persisting while this thread is blocked by a long synchronous task. Filtering and serialization
 * stay on the calling thread — log entries are not reliably structured-cloneable. Reads (log
 * downloads, feedback exports) instantiate `IdbLogStore` directly — IDB keeps the data.
 */
export class WorkerLogProcessor {
  readonly #worker: Pick<Worker, 'postMessage'>;
  readonly #tabId: string;
  readonly #traceContext?: () => TraceContext | undefined;
  #filters: LogFilter[] = [];
  #minLevel = Infinity;
  #pending: SerializedLogLine[] = [];
  #scheduled = false;

  constructor(options: WorkerLogProcessorOptions) {
    this.#worker = options.worker;
    this.#tabId = options.tabId ?? inferEnvironmentName();
    this.#traceContext = options.traceContext;
    this.setFilter(options.logFilter ?? DEFAULT_LOG_FILTER);

    this.#installLifecycleHandlers();
  }

  /**
   * Log processor — register via `log.addProcessor(processor)`.
   * Fire-and-forget: never throws and never awaits.
   */
  readonly processor: LogProcessor = (_config: LogConfig, entry: LogEntry) => {
    // Hot callers log far below the filter; reject them before `shouldLog` allocates per entry.
    if (entry.level < this.#minLevel || !shouldLog(entry, this.#filters)) {
      return;
    }
    const line = serializeToJsonl(entry, { env: this.#tabId, trace: this.#traceContext?.() });
    if (line === undefined) {
      return;
    }
    this.#pending.push(line);
    if (this.#pending.length >= MAX_LINES_PER_BATCH) {
      this.#postPending();
    } else if (!this.#scheduled) {
      this.#scheduled = true;
      queueMicrotask(() => {
        this.#scheduled = false;
        this.#postPending();
      });
    }
  };

  /**
   * Replace the filter, e.g. once the worker's config arrives.
   */
  setFilter(filter: string | string[] | LogLevel): void {
    this.#filters = parseFilter(filter);
    // Exclusion patterns can only reject, so no entry below the lowest inclusion level can pass.
    this.#minLevel = Math.min(
      ...this.#filters.filter((filter) => !filter.pattern?.startsWith('-')).map((filter) => filter.level),
    );
  }

  /**
   * Ask the worker to flush now. Fire-and-forget, same as the in-thread store's lifecycle
   * flushes — the worker's own timer bounds staleness to one flush interval either way.
   */
  flush(): void {
    this.#postPending();
    this.#post({ type: 'flush' });
  }

  #postPending(): void {
    if (this.#pending.length === 0) {
      return;
    }
    const lines = this.#pending;
    this.#pending = [];
    this.#post({ type: 'log-batch', lines });
  }

  #post(message: ObservabilityWorkerMessage): void {
    try {
      this.#worker.postMessage(message);
    } catch {
      // Logs must never throw out of the processor path.
    }
  }

  #installLifecycleHandlers(): void {
    if (typeof globalThis.addEventListener !== 'function') {
      return;
    }
    globalThis.addEventListener('pagehide', () => this.flush());
    globalThis.addEventListener('visibilitychange', () => {
      if (globalThis.document?.visibilityState === 'hidden') {
        this.flush();
      }
    });
  }
}
