//
// Copyright 2026 DXOS.org
//

/// <reference types="vite/client" />

import { LogLevel, shortLevelName, log, type LogConfig, type LogEntry, type LogProcessor } from '@dxos/log';
import { getDebugName } from '@dxos/util';

const MAX_CONTEXT_LENGTH = 500;

/** Coalesce sends to one macrotask; adjust if needed. */
const FLUSH_DEBOUNCE_MS = 16;

const getRelativeFilename = (filename: string): string => {
  const match = filename.match(/.+\/(packages\/.+\/.+)/);
  if (match) {
    return match[1];
  }
  return filename;
};

const entryToNdjsonLine = (_config: LogConfig, entry: LogEntry): string | null => {
  if (entry.level <= LogLevel.TRACE) {
    return null;
  }

  const record: Record<string, unknown> = {
    t: new Date().toISOString(),
    l: shortLevelName[entry.level] ?? '?',
    m: entry.message ?? '',
  };

  if (entry.meta) {
    record.f = getRelativeFilename(entry.meta.F);
    record.n = entry.meta.L;
  }

  const ctx = entry.context;

  let error = entry.error;
  if (!error && ctx?.error) {
    error = ctx.error;
    delete ctx.error;
  } else if (!error && ctx.err) {
    error = ctx.err;
    delete ctx.err;
  }

  if (error) {
    record.e = error.stack ?? error.message;
  }

  if (ctx != null) {
    try {
      const ctx1 = typeof ctx === 'function' ? ctx() : ctx;
      if (ctx1 != null && !(ctx1 instanceof Error)) {
        let json = JSON.stringify(ctx1);
        if (json.length > MAX_CONTEXT_LENGTH) {
          json = json.slice(0, MAX_CONTEXT_LENGTH);
        }
        record.c = json;
      }
    } catch {
      // Skip context that throws or is non-serializable.
    }
  }

  const scope = entry.meta?.S;
  if (typeof scope === 'object' && scope !== null && Object.getPrototypeOf(scope) !== Object.prototype) {
    record.o = getDebugName(scope);
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
