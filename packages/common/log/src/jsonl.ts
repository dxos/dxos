//
// Copyright 2026 DXOS.org
//

import { LogLevel, shortLevelName } from './config';
import { type LogEntry } from './context';

/**
 * Compact JSONL log record with short property names for small serialized size.
 *
 * Field names are intentionally one character to keep on-disk / on-wire size minimal —
 * a single record can be emitted thousands of times per session.
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
  /** Object/scope from which the log was emitted. */
  o?: string;
  /** Error stack. */
  e?: string;
  /** Context JSON (already a string of pre-stringified flat key/values). */
  c?: string;
  /** Environment identifier (see {@link inferEnvironmentName}). */
  i?: string;
};

/**
 * Options for {@link serializeToJsonl}.
 */
export type SerializeToJsonlOptions = {
  /**
   * Environment identifier embedded in the record's `i` field.
   * Use {@link inferEnvironmentName} for a default that disambiguates tabs and workers.
   */
  env?: string;
};

/**
 * Serialize a {@link LogEntry} to a single compact JSON line (no trailing newline).
 *
 * Returns `undefined` for entries at TRACE level — callers can use this to skip them.
 *
 * The output is compatible with newline-delimited JSON (NDJSON / JSONL): join multiple
 * results with `\n` for a stream / file representation.
 *
 * Context is taken from {@link LogEntry.computedContext}, which has already flattened
 * nested objects to strings (see `stringifyOneLevel` in `context.ts`), so the resulting
 * `c` field is a JSON string of a flat `Record<string, primitive>` map. The function
 * does **not** truncate context — callers that care about line size should set their own
 * cap before calling, or trim post-hoc.
 */
export const serializeToJsonl = (entry: LogEntry, opts: SerializeToJsonlOptions = {}): string | undefined => {
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
  if (opts.env !== undefined) {
    record.i = opts.env;
  }

  const computedContext = entry.computedContext;
  if (Object.keys(computedContext).length > 0) {
    try {
      record.c = JSON.stringify(computedContext);
    } catch {
      // Skip context that throws during serialization. `computedContext` is already flattened
      // via `stringifyOneLevel`, so this is best-effort belt-and-suspenders.
    }
  }

  try {
    return JSON.stringify(record);
  } catch {
    return undefined;
  }
};
