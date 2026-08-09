//
// Copyright 2026 DXOS.org
//

import { log as logger } from '@dxos/log';

import { type DebugPortOptions, resolveDebugPortOrigin, runDebugPortLoop } from './debug-port';

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
  /** Additional sink for the loop's lines, for hosts with no log surface of their own (the recovery page). */
  onLog?: (line: string) => void;
};

/**
 * Start/stop handle for the agent debug port.
 *
 * The port evaluates arbitrary code in the page, so it is never started implicitly: activation is
 * always an explicit gesture, the session id is regenerated each time, and nothing is persisted —
 * a reload leaves it stopped.
 */
export interface DebugPortController {
  getStatus(): DebugPortStatus;
  subscribe(listener: () => void): () => void;
  /** Returns the new session id; a no-op returning the current session if already running. */
  start(options?: DebugPortStartOptions): string;
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

  start({ scope = defaultScope, origin = resolveDebugPortOrigin(), onLog }: DebugPortStartOptions = {}): string {
    if (this.#status.running && this.#status.session) {
      return this.#status.session;
    }

    const session = randomSession();
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
