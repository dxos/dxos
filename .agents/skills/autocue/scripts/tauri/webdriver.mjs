//
// Copyright 2026 DXOS.org
//

/**
 * The few W3C WebDriver commands the Tauri page adapter needs, over plain `fetch`. A client library would
 * be a dependency for twenty lines of HTTP, and every command here is one endpoint of the spec.
 */

export class WebDriverError extends Error {
  constructor(command, { error, message }) {
    super(`${command}: ${error}${message ? ` — ${message.split('\n')[0]}` : ''}`);
    this.code = error;
  }
}

/**
 * Opens a session against `server` with `capabilities` and answers a client bound to it.
 *
 * @param {string} server Base URL of the WebDriver server, e.g. `http://127.0.0.1:4444`.
 * @param {object} capabilities `alwaysMatch` capabilities of the new session.
 */
export const createSession = async (server, capabilities) => {
  const call = async (method, path, body, signal) => {
    const response = await fetch(
      `${server}${path}`,
      body === undefined
        ? { method, signal }
        : { method, signal, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) },
    );
    const text = await response.text();
    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      throw new WebDriverError(`${method} ${path}`, { error: `HTTP ${response.status}`, message: text.slice(0, 200) });
    }
    if (!response.ok || payload.value?.error) {
      throw new WebDriverError(`${method} ${path}`, payload.value ?? { error: `HTTP ${response.status}` });
    }
    return payload.value;
  };

  const created = await call('POST', '/session', { capabilities: { alwaysMatch: capabilities } });
  const base = `/session/${created.sessionId}`;
  // One command at a time: the log drain and a gesture would otherwise interleave on a driver that
  // processes a session's commands serially anyway, and a queued command then times out spuriously.
  let queue = Promise.resolve();
  const session = (method, path = '', body) => {
    const next = queue.then(() => call(method, `${base}${path}`, body));
    queue = next.catch(() => {});
    return next;
  };

  return {
    id: created.sessionId,
    capabilities: created.capabilities,
    /** Runs `script` (a function body) with `args`; the body calls the last argument to resolve. */
    executeAsync: (script, args = []) => session('POST', '/execute/async', { script, args }),
    execute: (script, args = []) => session('POST', '/execute/sync', { script, args }),
    navigate: (url) => session('POST', '/url', { url }),
    url: () => session('GET', '/url'),
    screenshot: () => session('GET', '/screenshot'),
    /**
     * A screenshot outside the command queue, for a recorder that must not wait behind a long script. Bounded, and
     * abandoned when `signal` aborts, so a webview that stops answering cannot stall the recorder's shutdown.
     */
    frame: (signal) =>
      call(
        'GET',
        `${base}/screenshot`,
        undefined,
        AbortSignal.any([AbortSignal.timeout(5_000), ...(signal ? [signal] : [])]),
      ),
    setTimeouts: (timeouts) => session('POST', '/timeouts', timeouts),
    windowRect: () => session('GET', '/window/rect'),
    setWindowRect: (rect) => session('POST', '/window/rect', rect),
    performActions: (actions) => session('POST', '/actions', { actions }),
    releaseActions: () => session('DELETE', '/actions'),
    close: () => session('DELETE').catch(() => undefined),
  };
};
