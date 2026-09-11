//
// Copyright 2026 DXOS.org
//

import {
  type LogConfig,
  type LogEntry,
  type LogFilter,
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

/** One pre-serialized JSONL log line; the hot path carries no envelope. */
export type SerializedLogLine = string;

export type ObservabilityWorkerMessage =
  | SerializedLogLine
  | { type: 'flush' }
  | OtelLogSink.Message
  | OtelMetricsSink.Message
  | OtelSpanSink.Message;

export type WorkerLogProcessorOptions = {
  worker: Worker;
  /** Identifier embedded in every record's `i` field. Defaults to {@link inferEnvironmentName}. */
  tabId?: string;
  /** Same syntax as `DX_LOG` — entries below the minimum level are not sent. Default `debug`. */
  logFilter?: string;
  /** The span active on this thread, read per entry so the worker can link the record to its trace. */
  traceContext?: () => TraceContext | undefined;
};

/**
 * Log processor that forwards each pre-serialized JSONL line to the observability worker, which
 * owns the queue, flush timer, IDB writes and eviction. `postMessage` enqueues synchronously
 * inside the log call and delivery does not need this thread's event loop to turn, so the
 * worker keeps persisting while this thread is blocked by a long synchronous task. Filtering
 * and serialization stay on the calling thread — log entries are not reliably
 * structured-cloneable. Reads (log downloads, feedback exports) instantiate `IdbLogStore`
 * directly — IDB keeps the data.
 */
export class WorkerLogProcessor {
  readonly #worker: Worker;
  readonly #tabId: string;
  readonly #filters: LogFilter[];
  readonly #traceContext?: () => TraceContext | undefined;

  constructor(options: WorkerLogProcessorOptions) {
    this.#worker = options.worker;
    this.#tabId = options.tabId ?? inferEnvironmentName();
    this.#filters = parseFilter(options.logFilter ?? DEFAULT_LOG_FILTER);
    this.#traceContext = options.traceContext;

    this.#installLifecycleHandlers();
  }

  /**
   * Log processor — register via `log.addProcessor(processor)`.
   * Fire-and-forget: never throws and never awaits.
   */
  readonly processor: LogProcessor = (_config: LogConfig, entry: LogEntry) => {
    if (!shouldLog(entry, this.#filters)) {
      return;
    }
    const line = serializeToJsonl(entry, { env: this.#tabId, trace: this.#traceContext?.() });
    if (line === undefined) {
      return;
    }
    this.#post(line);
  };

  /**
   * Ask the worker to flush now. Fire-and-forget, same as the in-thread store's lifecycle
   * flushes — the worker's own timer bounds staleness to one flush interval either way.
   */
  flush(): void {
    this.#post({ type: 'flush' });
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
