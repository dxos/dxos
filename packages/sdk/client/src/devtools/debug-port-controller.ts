//
// Copyright 2026 DXOS.org
//

import { type DebugPortOptions, resolveDebugPortOrigin, runDebugPortLoop } from './debug-port';

/** Bindings in scope for evaluated snippets. */
export type DebugPortScope = Record<string, unknown>;

export type DebugPortStatus = {
  running: boolean;
  /** Fresh per activation; the agent must pass it to `composer-recovery.js --session`. */
  session?: string;
  origin?: string;
  log: readonly string[];
};

export type DebugPortStartOptions = {
  /** Resolved at each command so a late-booting client is picked up; defaults to the mounted devtools hook. */
  scope?: () => DebugPortScope;
  origin?: string;
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

/** Bounded so a long-lived session cannot grow the log without limit. */
const MAX_LOG_LINES = 500;

const STOPPED: DebugPortStatus = { running: false, log: [] };

class DebugPortControllerImpl implements DebugPortController {
  #status: DebugPortStatus = STOPPED;
  #log: string[] = [];
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

    const session = crypto.randomUUID();
    const abort = new AbortController();
    this.#abort = abort;
    this.#log = [];
    this.#update({ running: true, session, origin });

    const log = (line: string) => {
      this.#append(line);
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
          this.#update({ running: false });
        }
      });

    return session;
  }

  stop(): void {
    this.#abort?.abort();
    this.#abort = undefined;
    if (this.#status.running) {
      this.#append('Debug port stopped.');
      this.#update({ running: false });
    }
  }

  #append(line: string): void {
    this.#log = [...this.#log, line].slice(-MAX_LOG_LINES);
    this.#update({});
  }

  #update(patch: Partial<Omit<DebugPortStatus, 'log'>>): void {
    this.#status = { ...this.#status, ...patch, log: this.#log };
    this.#listeners.forEach((listener) => listener());
  }
}

const defaultScope = (): DebugPortScope => ({ dxos: (globalThis as any).__DXOS__ });

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
