//
// Copyright 2026 DXOS.org
//

import { type Resource, defaultResource, resourceFromAttributes } from '@opentelemetry/resources';
import { type LogRecordExporter } from '@opentelemetry/sdk-logs';

import { type LogRecord as JsonlLogRecord, LogLevel, log, shortLevelName } from '@dxos/log';

import { OtelLogs, convertLevel } from './logs';
import { type OtelDestination } from './otel';

/**
 * Sent once per connection to start log export in the worker. Carries the options the
 * producer realm resolved (config, env vars, opt-out state) — the worker itself is
 * config-free.
 */
export type OtelLogSinkInit = {
  type: 'otel-init';
  destinations: OtelDestination[];
  /** Plain resource attributes for the producing realm, including `session.id`. */
  resourceAttributes: Record<string, string>;
  /** Minimum level to export. */
  logLevel: LogLevel;
  tags: Record<string, string>;
};

/**
 * Control-plane messages the Otel extension posts to the telemetry worker when log export
 * runs there (see the extension's `telemetryWorker` option). Log lines themselves are not part of
 * this union — they arrive as bare JSONL strings on the same port, shipped by the log
 * processor.
 */
export type OtelLogSinkMessage =
  | OtelLogSinkInit
  | { type: 'otel-tags'; tags: Record<string, string> }
  | { type: 'otel-flush' };

/** Inverse of {@link shortLevelName}, keyed by the letter carried in each record's `l` field. */
const levelFromShortName = new Map<string, LogLevel>(
  [LogLevel.TRACE, LogLevel.DEBUG, LogLevel.VERBOSE, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR].map((level) => [
    shortLevelName[level],
    level,
  ]),
);

export type OtelLogSinkOptions = {
  /** Test seam: replaces the OTLP exporter. */
  exporter?: LogRecordExporter;
};

/**
 * Worker-side OTel log pipeline: turns the JSONL lines the telemetry worker already
 * receives into OTLP log records. Runs on the worker's own event loop, so batching and
 * export keep going while the producing realm is blocked by a long synchronous task — the
 * lines it logged from inside that task were posted synchronously and export in
 * near-real-time (see DX-1224).
 */
export class OtelLogSink {
  readonly #logs: OtelLogs;
  #tags: Record<string, string>;
  readonly #logLevel: LogLevel;

  constructor(init: OtelLogSinkInit, options: OtelLogSinkOptions = {}) {
    this.#tags = { ...init.tags };
    this.#logLevel = init.logLevel;
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
    let record: JsonlLogRecord;
    try {
      record = JSON.parse(line);
    } catch {
      return;
    }
    const level = levelFromShortName.get(record.l);
    if (level === undefined || level < this.#logLevel) {
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
    });
  }

  handleMessage(message: Exclude<OtelLogSinkMessage, OtelLogSinkInit>): void {
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

/**
 * The `c` field is a JSON string of a flat key/value map (see `serializeToJsonl`); keys get
 * the same `ctx_` prefix the in-process pipeline applies.
 */
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
