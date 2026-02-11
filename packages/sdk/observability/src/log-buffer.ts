//
// Copyright 2025 DXOS.org
//

import { type LogConfig, type LogEntry, LogLevel, type LogProcessor, shortLevelName } from '@dxos/log';
import { CircularBuffer } from '@dxos/util';

const DEFAULT_BUFFER_SIZE = 2_000;
const MAX_CONTEXT_LENGTH = 500;

/**
 * Compact log record with short property names for small serialized size.
 */
export type LogRecord = {
  /** ISO timestamp. */
  t: string;
  /** Level letter (D, V, I, W, E). */
  l: string;
  /** Message. */
  m: string;
  /** File path. */
  f?: string;
  /** Line number. */
  n?: number;
  /** Error stack. */
  e?: string;
  /** Context JSON. */
  c?: string;
};

/**
 * Captures recent log entries in a circular buffer for debug log dump on feedback submission.
 */
export class LogBuffer {
  private readonly _buffer: CircularBuffer<LogRecord>;

  constructor(size = DEFAULT_BUFFER_SIZE) {
    this._buffer = new CircularBuffer<LogRecord>(size);
  }

  /** Log processor that can be registered with `log.runtimeConfig.processors`. */
  readonly logProcessor: LogProcessor = (_config: LogConfig, entry: LogEntry) => {
    if (entry.level <= LogLevel.TRACE) {
      return;
    }

    const record: LogRecord = {
      t: new Date().toISOString(),
      l: shortLevelName[entry.level] ?? '?',
      m: entry.message ?? '',
    };

    if (entry.meta) {
      record.f = getRelativeFilename(entry.meta.F);
      record.n = entry.meta.L;
    }

    if (entry.error) {
      record.e = entry.error.stack ?? entry.error.message;
    }

    if (entry.context != null) {
      const ctx = typeof entry.context === 'function' ? entry.context() : entry.context;
      if (ctx != null && !(ctx instanceof Error)) {
        try {
          let json = JSON.stringify(ctx);
          if (json.length > MAX_CONTEXT_LENGTH) {
            json = json.slice(0, MAX_CONTEXT_LENGTH);
          }
          record.c = json;
        } catch {
          // Skip non-serializable context.
        }
      }
    }

    this._buffer.push(record);
  };

  /** Number of entries currently in the buffer. */
  get size(): number {
    return this._buffer.elementCount;
  }

  /** Serialize buffer contents as NDJSON (newline-delimited JSON). */
  serialize(): string {
    const lines: string[] = [];
    for (const record of this._buffer) {
      lines.push(JSON.stringify(record));
    }
    return lines.join('\n');
  }
}

const getRelativeFilename = (filename: string): string => {
  const match = filename.match(/.+\/(packages\/.+\/.+)/);
  if (match) {
    return match[1];
  }
  return filename;
};
