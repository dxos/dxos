//
// Copyright 2026 DXOS.org
//

import { log as logger } from '@dxos/log';

import { type DebugPortOptions, resolveDebugPortOrigin, runDebugPortLoop } from './debug-port.ts';

/** Bindings in scope for evaluated snippets. */
export type DebugPortScope = Record<string, unknown>;

export type DebugPortStatus = {
  running: boolean;
  /** Fresh per activation; the agent must pass it to `composer-recovery.js --session`. */
  session?: string;
  origin?: string;
};

export type DebugPortStartOptions = {
  /** Resolved at each command so a late-booting client is picked up; defaults to the mounted devtools hook. */
  scope?: () => DebugPortScope;
  origin?: string;
  /** Use this id instead of minting one; callers that omit it get a fresh random id per activation. */
  session?: string;
  /** Additional sink for the loop's lines, for hosts with no log surface of their own (the recovery page). */
  onLog?: (line: string) => void;
  /**
   * Keep the session across reloads of this tab, until {@link SESSION_TTL} expires or the tab closes.
   *
   * Off by default. A flow that navigates the page mid-debug — an OAuth redirect above all — otherwise
   * takes the port down with it and the agent has to ask for a fresh id at exactly the moment the
   * interesting state appears. Scoped to `sessionStorage` (this tab, this run) rather than
   * `localStorage`, so an arbitrary-eval port can never outlive the tab it was authorized in.
   */
  persist?: boolean;
};

/** How long a persisted session stays resumable. Bounded so a forgotten port lapses on its own. */
export const SESSION_TTL = 30 * 60 * 1000;

const STORAGE_KEY = 'dxos:debug-port-session';

type PersistedSession = { session: string; origin?: string; expiresAt: number };

const readPersisted = (): PersistedSession | undefined => {
  try {
    const raw = globalThis.sessionStorage?.getItem(STORAGE_KEY);
    if (!raw) {
      return undefined;
    }
    const parsed = JSON.parse(raw) as PersistedSession;
    if (typeof parsed?.session !== 'string' || typeof parsed?.expiresAt !== 'number') {
      return undefined;
    }
    return parsed.expiresAt > Date.now() ? parsed : undefined;
  } catch {
    return undefined;
  }
};

const writePersisted = (value: PersistedSession): void => {
  try {
    globalThis.sessionStorage?.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Storage disabled (private mode, blocked cookies): the port still works, it just will not resume.
  }
};

const clearPersisted = (): void => {
  try {
    globalThis.sessionStorage?.removeItem(STORAGE_KEY);
  } catch {
    // As above.
  }
};

/**
 * Start/stop handle for the agent debug port.
 *
 * The port evaluates arbitrary code in the page, so activation is always a deliberate act: flipping
 * the switch in the running app, or launching a dev server with the debug-port flag (compiled out of
 * production builds, so it cannot reach a deployed origin). The flag's caller knows the session id
 * up front only when it supplied `DX_DEBUG_PORT_SESSION`; with `DX_DEBUG_PORT` alone the id is
 * generated and read back from `temp/debug-port.json`.
 */
export interface DebugPortController {
  getStatus(): DebugPortStatus;
  subscribe(listener: () => void): () => void;
  /** Returns the new session id; a no-op returning the current session if already running. */
  start(options?: DebugPortStartOptions): string;
  /**
   * Restart a session persisted by `start({ persist: true })` in this tab, reusing its id so the
   * agent's existing session id keeps working across the reload. Returns the id, or `undefined`
   * when there is nothing live to resume. Never mints a new session: with no unexpired record this
   * is a no-op, so calling it at startup cannot turn the port on by itself.
   */
  resume(options?: DebugPortStartOptions): string | undefined;
  stop(): void;
}

const STOPPED: DebugPortStatus = { running: false };

class DebugPortControllerImpl implements DebugPortController {
  #status: DebugPortStatus = STOPPED;
  #abort?: AbortController;
  readonly #listeners = new Set<() => void>();

  getStatus(): DebugPortStatus {
    return this.#status;
  }

  subscribe(listener: () => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  start(options: DebugPortStartOptions = {}): string {
    return this.#run(options.session ?? randomSession(), options);
  }

  resume(options: DebugPortStartOptions = {}): string | undefined {
    if (this.#status.running && this.#status.session) {
      return this.#status.session;
    }
    const persisted = readPersisted();
    if (!persisted) {
      // Also drops a record that has merely expired, so a stale one cannot linger unnoticed.
      clearPersisted();
      return undefined;
    }
    return this.#run(persisted.session, { ...options, origin: options.origin ?? persisted.origin, persist: true });
  }

  #run(
    session: string,
    { scope = defaultScope, origin = resolveDebugPortOrigin(), onLog, persist }: DebugPortStartOptions,
  ): string {
    if (this.#status.running && this.#status.session) {
      return this.#status.session;
    }

    if (persist) {
      writePersisted({ session, origin, expiresAt: Date.now() + SESSION_TTL });
    }
    const abort = new AbortController();
    this.#abort = abort;
    this.#update({ running: true, session, origin });

    // Every line goes through @dxos/log: it is the record of what an agent evaluated in this page,
    // so it belongs in the buffer the log panel reads and the log bundle the user can download —
    // not in a private array that dies with the session.
    const log = (line: string) => {
      logger.info(line, { session });
      onLog?.(line);
    };

    void runDebugPortLoop({
      session,
      origin,
      evalCommand: makeEvalCommand(scope),
      onLog: log,
      signal: abort.signal,
    })
      .catch((error) => {
        if (!abort.signal.aborted) {
          log(`Debug port error: ${error instanceof Error ? error.message : String(error)}`);
        }
      })
      .finally(() => {
        // A later start() has already replaced the controller state; leave it alone.
        if (this.#abort === abort) {
          this.#abort = undefined;
          this.#reset();
        }
      });

    return session;
  }

  stop(): void {
    // Clear first: stopping is the user withdrawing consent, so the record must not survive even if
    // the abort below throws.
    clearPersisted();
    this.#abort?.abort();
    this.#abort = undefined;
    if (this.#status.running) {
      logger.info('Debug port stopped.', { session: this.#status.session });
      this.#reset();
    }
  }

  #update(patch: Partial<DebugPortStatus>): void {
    this.#status = { ...this.#status, ...patch };
    this.#notify();
  }

  // Back to STOPPED rather than merging `running: false`, so `getStatus()` cannot hand out a dead
  // session id to a consumer that reads `session` without also checking `running`.
  #reset(): void {
    this.#status = STOPPED;
    this.#notify();
  }

  #notify(): void {
    this.#listeners.forEach((listener) => listener());
  }
}

// `crypto.randomUUID` is secure-context only, and the port is worth having on a plain-HTTP LAN
// origin — the id is a handshake nonce, not a secret, so a `getRandomValues` hex string does.
const randomSession = (): string => {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
};

// `composer` is the app-layer namespace (plugins, operations); it is absent on the recovery page
// and until the app has mounted, which an agent probing it can see for itself.
const defaultScope = (): DebugPortScope => ({
  dxos: (globalThis as any).__DXOS__,
  composer: (globalThis as any).composer,
});

const makeEvalCommand =
  (scope: () => DebugPortScope): DebugPortOptions['evalCommand'] =>
  async (code) => {
    const bindings = scope();
    const names = Object.keys(bindings);
    // eslint-disable-next-line no-new-func, @typescript-eslint/no-implied-eval -- the debug port is arbitrary eval by design; user-initiated only.
    const runner = new Function(...names, `"use strict"; return (async () => { ${code} })();`);
    return runner(...names.map((name) => bindings[name]));
  };

let controller: DebugPortController | undefined;

/**
 * Process-wide debug port. A single loop per page keeps one session id authoritative,
 * so the recovery page and the running app cannot race two ports against one server.
 */
export const getDebugPortController = (): DebugPortController => (controller ??= new DebugPortControllerImpl());
