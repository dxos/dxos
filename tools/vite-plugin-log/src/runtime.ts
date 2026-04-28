//
// Copyright 2026 DXOS.org
//

/// <reference types="vite/client" />

import { LogLevel, shortLevelName, log, type LogConfig, type LogEntry, type LogProcessor } from '@dxos/log';

const MAX_CONTEXT_LENGTH = 500;

/** Coalesce sends to one macrotask; adjust if needed. */
const FLUSH_DEBOUNCE_MS = 16;

const entryToNdjsonLine = (_config: LogConfig, entry: LogEntry): string | null => {
  if (entry.level <= LogLevel.TRACE) {
    return null;
  }

  const { filename, line, context: scopeName } = entry.computedMeta;

  const record: Record<string, unknown> = {
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

  return `${JSON.stringify(record)}\n`;
};

let buffer = '';
let flushTimeout: ReturnType<typeof setTimeout> | null = null;

const flush = (): void => {
  flushTimeout = null;
  if (buffer.length === 0 || import.meta.hot == null) {
    return;
  }
  const chunk = buffer;
  buffer = '';
  import.meta.hot.send('dxos-plugin:log', { chunk });
};

const scheduleFlush = (): void => {
  if (import.meta.hot == null) {
    return;
  }
  if (flushTimeout !== null) {
    return;
  }
  flushTimeout = setTimeout(flush, FLUSH_DEBOUNCE_MS);
};

const viteLogForwardProcessor: LogProcessor = (config, entry) => {
  const line = entryToNdjsonLine(config, entry);
  if (line == null) {
    return;
  }
  buffer += line;
  scheduleFlush();
};

if (import.meta.hot) {
  log.addProcessor(viteLogForwardProcessor);
  import.meta.hot.dispose(() => {
    if (flushTimeout !== null) {
      clearTimeout(flushTimeout);
      flushTimeout = null;
    }
    flush();
  });
}
