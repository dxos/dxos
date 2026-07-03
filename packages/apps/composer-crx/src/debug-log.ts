//
// Copyright 2024 DXOS.org
//

/**
 * Development-only diagnostic logging.
 *
 * The extension runs across isolated contexts (background worker, side panel, content script) whose
 * consoles are awkward to observe together. `debugLog` fire-and-forget POSTs structured entries to a
 * local collector so the extension's runtime behaviour can be tailed from a single file while
 * debugging off-device (e.g. the resolved chat-agent endpoint and chat-agent errors).
 *
 * - Active only in dev builds (`import.meta.env.DEV`); compiled out of production bundles.
 * - The collector is `scripts/debug-log-server.mjs` (run it, then `tail -f crx-debug.jsonl`); it
 *   listens on {@link ENDPOINT}. When it is not running the POST fails silently, so this is safe to
 *   leave wired in.
 * - Errors are always swallowed: diagnostics must never affect runtime behaviour.
 */
const ENDPOINT = 'http://localhost:9999/log';

/** Serialize an Error including its non-enumerable message/name/stack and any own props the SDK attached. */
const serializeError = (error: unknown): unknown => {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack, extra: { ...error } };
  }
  return error;
};

export const debugLog = (event: string, data?: unknown): void => {
  if (!import.meta.env.DEV) {
    return;
  }

  try {
    void fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ts: new Date().toISOString(),
        event,
        data: data instanceof Error ? serializeError(data) : data,
      }),
    }).catch(() => {});
  } catch {
    // Ignore — diagnostics must never affect runtime.
  }
};
