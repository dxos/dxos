//
// Copyright 2025 DXOS.org
//

import { CircularBuffer } from '@dxos/util';

import { type LogConfig, LogLevel, shortLevelName } from './config';
import { type LogEntry, type LogProcessor } from './context';

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
  /* Object from which the log was emitted. */
  o?: string;
  /** Error stack. */
  e?: string;
  /** Context JSON. */
  c?: string;
};

/**
 * Captures recent log entries in a circular buffer for debug log dump.
 */
export class LogBuffer {
  private readonly _buffer: CircularBuffer<LogRecord>;

  constructor(size = DEFAULT_BUFFER_SIZE) {
    this._buffer = new CircularBuffer<LogRecord>(size);
  }

  /**
   * Log processor that can be registered with `log.runtimeConfig.processors`.
   * Captures every level except TRACE (does not apply `shouldLog` / filter; use for full debug dumps).
   */
  readonly logProcessor: LogProcessor = (_config: LogConfig, entry: LogEntry) => {
    if (entry.level <= LogLevel.TRACE) {
      return;
    }

    const { filename, line, context: scopeName } = entry.computedMeta;

    const record: LogRecord = {
      t: new Date(entry.timestamp).toISOString(),
      l: shortLevelName[entry.level] ?? '?',
      m: entry.message ?? '',
    };

    if (filename !== undefined) {
      record.f = filename;
    }
    if (line !== undefined) {
      record.n = line;
    }
    if (scopeName !== undefined) {
      record.o = scopeName;
    }

    if (entry.computedError !== undefined) {
      record.e = entry.computedError;
    }

    const computedContext = entry.computedContext;
    if (Object.keys(computedContext).length > 0) {
      try {
        let json = JSON.stringify(computedContext);
        if (json.length > MAX_CONTEXT_LENGTH) {
          json = json.slice(0, MAX_CONTEXT_LENGTH);
        }
        record.c = json;
      } catch {
        // Skip context that throws or is non-serializable.
      }
    }

    this._buffer.push(record);
  };

  /** Number of entries currently in the buffer. */
  get size(): number {
    return this._buffer.elementCount;
  }

  /** Discard all buffered entries. */
  clear(): void {
    this._buffer.clear();
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
