//
// Copyright 2026 DXOS.org
//

// Tool-call logging — drives future tool prioritization.
//
// Every tool call is logged; failed structured queries that fall through to
// search_code (when added in a later phase) get logged separately. This is
// intentionally minimal — appending JSONL is enough for the analysis we want
// to do later, and keeps the runtime dependency surface small.

import { appendFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

export type ToolLogEntry = {
  tool: string;
  args?: unknown;
  count?: number;
  found?: boolean;
  truncated?: string;
};

export type ToolLogger = (entry: ToolLogEntry) => void;

export const noopLogger: ToolLogger = () => {};

/**
 * Wrap a logger so it always sees a timestamp and never throws into the caller.
 * Returns the wrapped logger; if `inner` is undefined, returns a no-op.
 */
export const registerLogger = (inner?: ToolLogger): ToolLogger => {
  if (!inner) {
    return noopLogger;
  }
  return (entry) => {
    try {
      inner(entry);
    } catch {
      // Logger failures must not break tool calls.
    }
  };
};

/**
 * Append-only JSONL logger. Creates the parent directory on first write.
 */
export const fileLogger = (path: string): ToolLogger => {
  let ensured = false;
  return (entry) => {
    const line = `${JSON.stringify({ ts: new Date().toISOString(), ...entry })}\n`;
    void (async () => {
      if (!ensured) {
        await mkdir(dirname(path), { recursive: true });
        ensured = true;
      }
      await appendFile(path, line, 'utf8');
    })().catch(() => undefined);
  };
};
