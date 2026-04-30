//
// Copyright 2026 DXOS.org
//

import { type LogEntry, LogLevel, shortLevelName } from '@dxos/log';

const MAX_CONTEXT_LENGTH = 500;

/**
 * Compact log record with short property names for small serialized size.
 * Mirrors the shape used by `@dxos/log` `LogBuffer`.
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
  /** Object from which the log was emitted. */
  o?: string;
  /** Error stack. */
  e?: string;
  /** Context JSON. */
  c?: string;
  /** Tab identifier (random per page load). */
  i?: string;
};

/**
 * Encode a {@link LogEntry} to a compact JSON line (no trailing newline).
 * Entries at TRACE level are skipped (returns `undefined`).
 */
export const encodeLogEntry = (entry: LogEntry, tabId?: string): string | undefined => {
  if (entry.level <= LogLevel.TRACE) {
    return undefined;
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
  if (tabId !== undefined) {
    record.i = tabId;
  }

  const computedContext = entry.computedContext;
  if (Object.keys(computedContext).length > 0) {
    // Flatten the context to a single level.
    const ctx: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(computedContext)) {
      if (typeof value === 'object' && value !== null) {
        ctx[key] = String(value);
      } else {
        ctx[key] = value;
      }
    }
    record.c = JSON.stringify(ctx);
  }

  try {
    return JSON.stringify(record);
  } catch {
    return undefined;
  }
};

/**
 * Trim a list of pre-encoded JSONL lines so the joined output (with `\n` separators)
 * fits within `maxSize` bytes (UTF-8). The newest lines (end of array) are preferred —
 * lines are dropped from the start. Never cuts inside a line.
 *
 * Returns the trimmed JSONL string (no trailing newline).
 */
export const trimJsonlToSize = (lines: readonly string[], maxSize: number): string => {
  if (lines.length === 0 || maxSize <= 0) {
    return '';
  }

  const sizes = lines.map((line) => byteLengthUtf8(line));

  // Walk newest -> oldest, accumulating until next addition would exceed maxSize.
  let total = 0;
  let firstIncludedIndex = lines.length;
  for (let index = lines.length - 1; index >= 0; index--) {
    const lineBytes = sizes[index];
    const sepBytes = total === 0 ? 0 : 1;
    if (total + lineBytes + sepBytes > maxSize) {
      break;
    }
    total += lineBytes + sepBytes;
    firstIncludedIndex = index;
  }

  if (firstIncludedIndex >= lines.length) {
    return '';
  }
  return lines.slice(firstIncludedIndex).join('\n');
};

const utf8Encoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : undefined;

const byteLengthUtf8 = (value: string): number => {
  if (utf8Encoder) {
    return utf8Encoder.encode(value).length;
  }
  // Fallback: assume 1 byte per char (good enough for ASCII-heavy log lines).
  return value.length;
};
