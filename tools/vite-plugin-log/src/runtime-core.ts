//
// Copyright 2026 DXOS.org
//

import {
  type LogConfig,
  type LogEntry,
  type LogProcessor,
  log,
  parseFilter,
  shortLevelName,
  shouldLog,
} from '@dxos/log';

import { VITE_PLUGIN_LOG_SINK_PATH } from './constants.ts';

const MAX_CONTEXT_LENGTH = 500;

/** Coalesce sends to one macrotask; adjust if needed. */
const FLUSH_DEBOUNCE_MS = 16;

/**
 * Injected by vite-plugin-log via `config.define`; when absent (_e.g._ prebundled artifact),
 * falls back through `typeof` short-circuit to `debug`.
 */
declare const __DXOS_VITE_PLUGIN_LOG_FILTER__: string | undefined;

const logFilterExpr =
  typeof __DXOS_VITE_PLUGIN_LOG_FILTER__ !== 'undefined' ? __DXOS_VITE_PLUGIN_LOG_FILTER__ : 'debug';

const vitePluginLogFilters = parseFilter(logFilterExpr);

const entryToNdjsonLine = (_config: LogConfig, entry: LogEntry): string => {
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

export type Transport = (chunk: string) => void;

/** Default transport: POST to the dev server sink endpoint. Works in any fetch-capable realm. */
export const httpTransport: Transport = (chunk) => {
  // `keepalive: true` lets the request finish if the worker is torn down mid-flush.
  void fetch(VITE_PLUGIN_LOG_SINK_PATH, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: chunk,
    keepalive: true,
  }).catch(() => {
    // Sink unavailable (production build, dev server gone) — drop silently.
  });
};

export type RuntimeHandle = {
  /** Immediately flush any buffered log lines through the configured transport. */
  flush: () => void;
};

// Per-realm guard: the runtime may be installed via both the page HTML injection and a direct
// import (e.g. a vitest browser setup file). Each JS realm (page / worker) gets its own globalThis,
// so a single processor is installed per realm and log lines are not duplicated.
const RUNTIME_HANDLE_KEY = '__DXOS_VITE_PLUGIN_LOG_RUNTIME__';

/** Register the log processor and start forwarding entries through `transport`. */
export const installRuntime = (transport: Transport): RuntimeHandle => {
  const realm = globalThis as Record<string, unknown>;
  const existing = realm[RUNTIME_HANDLE_KEY] as RuntimeHandle | undefined;
  if (existing !== undefined) {
    return existing;
  }

  let buffer = '';
  let flushTimeout: ReturnType<typeof setTimeout> | null = null;

  const flush = (): void => {
    flushTimeout = null;
    if (buffer.length === 0) {
      return;
    }
    const chunk = buffer;
    buffer = '';
    transport(chunk);
  };

  const scheduleFlush = (): void => {
    if (flushTimeout !== null) {
      return;
    }
    flushTimeout = setTimeout(flush, FLUSH_DEBOUNCE_MS);
  };

  const processor: LogProcessor = (config, entry) => {
    if (!shouldLog(entry, vitePluginLogFilters)) {
      return;
    }
    buffer += entryToNdjsonLine(config, entry);
    scheduleFlush();
  };

  log.addProcessor(processor);

  const handle: RuntimeHandle = { flush };
  realm[RUNTIME_HANDLE_KEY] = handle;
  return handle;
};
