//
// Copyright 2026 DXOS.org
//

/** Default port for `composer-recovery.js` — keep in sync with that script. */
export const DEBUG_PORT = 9321;

/** Browser retry interval when the debug server is unreachable — keep in sync with `composer-recovery.js`. */
export const DEBUG_PORT_RECONNECT_MS = 2_000;

/**
 * Debug server origin matching the page scheme.
 * HTTPS pages must use an HTTPS debug server (mixed content blocks http://127.0.0.1).
 */
export const resolveDebugPortOrigin = (port = DEBUG_PORT): string => {
  const scheme = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'https' : 'http';
  return `${scheme}://127.0.0.1:${port}`;
};

const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]', '::1']);

/**
 * The loop evaluates whatever the server hands it, so the server must be one only a local process
 * can be. `origin` is caller-supplied and reaches `fetch` directly; a remote CORS-enabled host would
 * otherwise be able to drive `eval` in the page.
 */
export const assertLoopbackOrigin = (origin: string): URL => {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    throw new Error(`Debug port origin is not a URL: ${origin}`);
  }
  // A scheme `fetch` cannot speak would otherwise fail past the hostname check and retry forever.
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`Debug port origin must use HTTP(S), got ${url.protocol}`);
  }
  if (!LOOPBACK_HOSTS.has(url.hostname)) {
    throw new Error(`Debug port origin must be loopback, got ${url.origin}`);
  }
  return url;
};

export type DebugCommand = {
  id: number;
  code: string;
};

export type DebugResultPayload = {
  session: string;
  id: number;
  ok: boolean;
  result?: unknown;
  error?: string;
};

export type DebugPortOptions = {
  session: string;
  origin?: string;
  evalCommand: (code: string) => Promise<unknown>;
  onLog?: (line: string) => void;
  signal?: AbortSignal;
};

/**
 * Long-poll loop against the local `composer-recovery.js` server.
 */
export const runDebugPortLoop = async ({
  session,
  origin = resolveDebugPortOrigin(),
  evalCommand,
  onLog,
  signal,
}: DebugPortOptions): Promise<void> => {
  const log = (line: string) => onLog?.(line);

  assertLoopbackOrigin(origin);

  log(`Session: ${session}`);
  log(`Connecting to ${origin}…`);
  log(`node composer-recovery.js --session ${session} "<js snippet>"`);
  log('(Copy the session id above into every composer-recovery.js command.)');

  let waitingLogged = false;

  while (!signal?.aborted) {
    let command: DebugCommand | undefined;
    try {
      command = await pollCommand(origin, session, signal);
    } catch (error) {
      if (signal?.aborted) {
        break;
      }
      if (!waitingLogged) {
        log('Waiting for debug server…');
        waitingLogged = true;
      }
      await sleep(DEBUG_PORT_RECONNECT_MS, signal);
      continue;
    }

    waitingLogged = false;

    if (!command) {
      continue;
    }

    log(`Command #${command.id}:`);
    log(command.code);
    log(`Evaluating command #${command.id}…`);
    let payload: DebugResultPayload;
    try {
      const result = await evalCommand(command.code);
      payload = { session, id: command.id, ok: true, result: serializeResult(result) };
      log(`Command #${command.id} ok`);
    } catch (error) {
      payload = {
        session,
        id: command.id,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
      log(`Command #${command.id} error: ${payload.error}`);
    }

    // Keep re-posting the same payload: the caller is blocked waiting for this id, and in one-shot
    // mode nothing re-sends it — dropping through to the next poll loses the result for good.
    let posted = false;
    while (!posted && !signal?.aborted) {
      try {
        await postResult(origin, payload, signal);
        posted = true;
      } catch (error) {
        if (signal?.aborted) {
          break;
        }
        log('Debug server unreachable posting result — retrying…');
        await sleep(DEBUG_PORT_RECONNECT_MS, signal);
      }
    }
  }
};

const sleep = (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true },
    );
  });

const parseDebugCommand = (value: unknown): DebugCommand | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.id !== 'number' || typeof record.code !== 'string') {
    return undefined;
  }
  return { id: record.id, code: record.code };
};

const pollCommand = async (
  origin: string,
  session: string,
  signal?: AbortSignal,
): Promise<DebugCommand | undefined> => {
  const url = new URL('/poll', assertLoopbackOrigin(origin));
  url.searchParams.set('session', session);
  // `redirect: 'error'` so a loopback server cannot bounce evaluation off to a remote origin.
  const response = await fetch(url, { signal, redirect: 'error' });
  if (response.status === 204) {
    return undefined;
  }
  if (!response.ok) {
    throw new Error(`Poll failed: ${response.status} ${response.statusText}`);
  }
  const command = parseDebugCommand(await response.json());
  if (!command) {
    throw new Error('Invalid debug command payload');
  }
  return command;
};

const postResult = async (origin: string, payload: DebugResultPayload, signal?: AbortSignal) => {
  const response = await fetch(new URL('/result', assertLoopbackOrigin(origin)), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
    redirect: 'error',
  });
  if (!response.ok) {
    throw new Error(`Result post failed: ${response.status} ${response.statusText}`);
  }
};

const serializeResult = (value: unknown): unknown => {
  if (value instanceof Uint8Array) {
    return { __type: 'Uint8Array', byteLength: value.byteLength, base64: bytesToBase64(value) };
  }
  if (value instanceof ArrayBuffer) {
    return serializeResult(new Uint8Array(value));
  }
  try {
    JSON.stringify(value);
    return value;
  } catch {
    return String(value);
  }
};

const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  const chunk = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunk) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunk));
  }
  return btoa(binary);
};
