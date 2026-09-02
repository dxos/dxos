//
// Copyright 2026 DXOS.org
//

// Standalone entrypoint, not a barrel namespace: this is loaded by the log-writer worker, and
// hoisting it onto the root barrel would put it in the graph of everyone importing the package.

import { type Resource, defaultResource, resourceFromAttributes } from '@opentelemetry/resources';
import { type LogRecordExporter } from '@opentelemetry/sdk-logs';

import { type LogRecord as JsonlLogRecord, LogLevel, log, shortLevelName } from '@dxos/log';

import { OtelLogs, convertLevel } from './logs';
import { type OtelDestination } from './otel';
import { contextForTrace } from './trace-context';

export type Init = {
  type: 'otel-init';
  destinations: OtelDestination[];
  resourceAttributes: Record<string, string>;
  logLevel: LogLevel;
  tags: Record<string, string>;
};

export type Message = Init | { type: 'otel-tags'; tags: Record<string, string> } | { type: 'otel-flush' };

const levelFromShortName = new Map<string, LogLevel>(
  [LogLevel.TRACE, LogLevel.DEBUG, LogLevel.VERBOSE, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR].map((level) => [
    shortLevelName[level],
    level,
  ]),
);

export type Options = {
  exporter?: LogRecordExporter;
  /**
   * Called with the trace id of every record at warning or above that names one, before the export
   * level is applied: a warning the sink does not export still marks its trace as worth keeping.
   */
  onTraceFlagged?: (traceId: string) => void;
};

export class Sink {
  readonly #logs: OtelLogs;
  #tags: Record<string, string>;
  readonly #logLevel: LogLevel;
  readonly #onTraceFlagged?: (traceId: string) => void;

  constructor(init: Init, options: Options = {}) {
    this.#tags = { ...init.tags };
    this.#logLevel = init.logLevel;
    this.#onTraceFlagged = options.onTraceFlagged;
    this.#logs = new OtelLogs({
      destinations: init.destinations,
      resource: createResource(init.resourceAttributes),
      getTags: () => this.#tags,
      logLevel: init.logLevel,
      exporter: options.exporter,
    });
  }

  /**
   * Ingest one pre-serialized JSONL log line (the same string the IDB store appends).
   * Never throws — a malformed line is dropped.
   */
  append(line: string): void {
    let record: JsonlLogRecord | null;
    try {
      record = JSON.parse(line);
    } catch {
      return;
    }
    // `JSON.parse` also succeeds on bare primitives; only an object carries the record fields.
    if (record === null || typeof record !== 'object') {
      return;
    }
    const level = levelFromShortName.get(record.l);
    if (level === undefined) {
      return;
    }
    if (level >= LogLevel.WARN && record.r !== undefined) {
      this.#onTraceFlagged?.(record.r);
    }
    if (level < this.#logLevel) {
      return;
    }

    this.#logs.emit({
      severityNumber: convertLevel(level),
      body: record.m,
      timestamp: new Date(record.t),
      attributes: {
        ...(record.f !== undefined ? { meta: { file: record.f, line: record.n } } : {}),
        ...(record.e !== undefined ? { error: record.e } : {}),
        ...parseContext(record.c),
      },
      // Captured on the emitting thread, where the span was active; rebuilt here so the SDK links
      // the record to it.
      context:
        record.r !== undefined && record.s !== undefined
          ? contextForTrace({ traceId: record.r, spanId: record.s })
          : undefined,
    });
  }

  handleMessage(message: Exclude<Message, Init>): void {
    switch (message.type) {
      case 'otel-tags': {
        this.#tags = { ...this.#tags, ...message.tags };
        break;
      }
      case 'otel-flush': {
        void this.flush().catch((err) => log.catch(err));
        break;
      }
    }
  }

  flush(): Promise<void> {
    return this.#logs.flush();
  }

  close(): Promise<void> {
    return this.#logs.close();
  }
}

const createResource = (attributes: Record<string, string>): Resource =>
  defaultResource().merge(resourceFromAttributes(attributes));

const parseContext = (context: string | undefined): Record<string, string> => {
  if (!context) {
    return {};
  }
  try {
    const parsed: Record<string, unknown> = JSON.parse(context);
    return Object.fromEntries(
      Object.entries(parsed)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => [`ctx_${key}`, typeof value === 'string' ? value : JSON.stringify(value)]),
    );
  } catch {
    return {};
  }
};
