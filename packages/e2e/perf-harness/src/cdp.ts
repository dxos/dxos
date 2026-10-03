//
// Copyright 2026 DXOS.org
//

import { type TargetKind } from './types.ts';

/**
 * Minimal CDP client over one target's websocket.
 *
 * Raw rather than Playwright's `newCDPSession`, because that wrapper can only reach the page and
 * its dedicated workers — it cannot attach to a SHARED worker, which is where ECHO, automerge and
 * the whole database live. Measuring a DXOS flow through Playwright's CDP alone therefore reports
 * the renderer and silently omits the process that does the work.
 *
 * Adopted from `composer-app/scripts/memory/measure.mjs`, which hit the same wall first.
 */
type Pending = {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  timer?: ReturnType<typeof setTimeout>;
};

export class Cdp {
  readonly #ws: WebSocket;
  #id = 0;
  #pending = new Map<number, Pending>();
  #listeners = new Map<string, Set<(params: any) => void>>();

  private constructor(ws: WebSocket) {
    this.#ws = ws;
  }

  static async connect(wsUrl: string, { timeoutMs }: { timeoutMs?: number } = {}): Promise<Cdp> {
    const ws = new WebSocket(wsUrl);
    await new Promise<void>((resolve, reject) => {
      const timer =
        timeoutMs === undefined
          ? undefined
          : setTimeout(() => {
              ws.close();
              reject(new Error(`CDP connect timed out: ${wsUrl}`));
            }, timeoutMs);
      ws.addEventListener('open', () => (clearTimeout(timer), resolve()), { once: true });
      ws.addEventListener('error', () => (clearTimeout(timer), reject(new Error(`CDP connect failed: ${wsUrl}`))), {
        once: true,
      });
    });
    const client = new Cdp(ws);

    // Otherwise every in-flight request awaits a socket that will never answer.
    const fail = (reason: string) => {
      for (const { reject, timer } of client.#pending.values()) {
        clearTimeout(timer);
        reject(new Error(reason));
      }
      client.#pending.clear();
    };
    client.#ws.addEventListener('close', () => fail('CDP socket closed'));
    client.#ws.addEventListener('error', () => fail('CDP socket error'));
    client.#ws.addEventListener('message', ({ data }) => {
      const message = JSON.parse(String(data));
      const pending = message.id != null ? client.#pending.get(message.id) : undefined;
      if (pending) {
        client.#pending.delete(message.id);
        clearTimeout(pending.timer);
        message.error ? pending.reject(new Error(String(message.error.message))) : pending.resolve(message.result);
      } else if (message.method) {
        for (const listener of client.#listeners.get(message.method) ?? []) {
          listener(message.params);
        }
      }
    });
    return client;
  }

  /**
   * Sends a command and resolves with its result.
   *
   * The readyState guard is load-bearing rather than defensive: Node's global `WebSocket` SILENTLY
   * ignores `send()` once the socket is closing or closed, so a request enqueued after the `close`
   * listener has already drained `#pending` would never settle — and `trySend` has no timeout, so
   * the awaiting stage would hang until playwright's outer budget aborted the whole flow. A target
   * that disappears between `refreshTargets` and a read is exactly that case.
   *
   * `timeoutMs` rejects a command the target accepts but never answers (a shared worker leaves
   * `HeapProfiler.collectGarbage` pending forever) and drops it from `#pending`, so an unanswered
   * request on a session kept across stages is not retained for the rest of the run.
   */
  send<T = any>(
    method: string,
    params: Record<string, unknown> = {},
    { timeoutMs }: { timeoutMs?: number } = {},
  ): Promise<T> {
    if (this.#ws.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error(`CDP socket is not open (readyState ${this.#ws.readyState})`));
    }
    const id = ++this.#id;
    return new Promise<T>((resolve, reject) => {
      const timer =
        timeoutMs === undefined
          ? undefined
          : setTimeout(() => {
              this.#pending.delete(id);
              reject(new Error(`CDP ${method} timed out after ${timeoutMs} ms`));
            }, timeoutMs);
      this.#pending.set(id, { resolve, reject, timer });
      try {
        this.#ws.send(JSON.stringify({ id, method, params }));
      } catch (error) {
        // Removed before rejecting, so a later drain cannot settle it twice.
        this.#pending.delete(id);
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  /** Send and swallow — for domains a given target type does not implement, and timeouts. */
  async trySend<T = any>(
    method: string,
    params: Record<string, unknown> = {},
    options: { timeoutMs?: number } = {},
  ): Promise<T | undefined> {
    try {
      return await this.send<T>(method, params, options);
    } catch {
      return undefined;
    }
  }

  on(method: string, fn: (params: any) => void): void {
    const existing = this.#listeners.get(method);
    if (existing) {
      existing.add(fn);
    } else {
      this.#listeners.set(method, new Set([fn]));
    }
  }

  off(method: string, fn: (params: any) => void): void {
    this.#listeners.get(method)?.delete(fn);
  }

  close(): void {
    this.#ws.close();
  }
}

export type TargetInfo = {
  id: string;
  type: string;
  url: string;
  title: string;
  webSocketDebuggerUrl?: string;
};

const MEASURED: readonly TargetKind[] = ['page', 'shared_worker', 'worker', 'service_worker'];

const isMeasured = (type: string): type is TargetKind => MEASURED.some((kind) => kind === type);

/** Targets worth measuring, discovered over the debug port's HTTP endpoint. */
export const listTargets = async (port: number): Promise<TargetInfo[]> => {
  const response = await fetch(`http://127.0.0.1:${port}/json/list`);
  const targets: TargetInfo[] = await response.json();
  return targets.filter((target) => isMeasured(target.type) && target.webSocketDebuggerUrl);
};

/** The browser-level target, which is the only one that answers `SystemInfo.*`. */
export const browserEndpoint = async (port: number): Promise<string> => {
  const response = await fetch(`http://127.0.0.1:${port}/json/version`);
  const version: { webSocketDebuggerUrl: string } = await response.json();
  return version.webSocketDebuggerUrl;
};

/**
 * Stable short name for a target, so rows join across iterations and runs.
 *
 * Shared workers are keyed by script filename rather than full URL: the URL carries a cache-busting
 * query in dev and a content hash in production, either of which would make every run's columns
 * unique and the trend unjoinable.
 */
export const targetName = (target: TargetInfo): string => {
  if (target.type === 'page') {
    return 'page';
  }
  const file = target.url.split('?')[0].split('/').pop() ?? target.id;
  return `${target.type}:${file.replace(/-[0-9a-f]{8,}\./, '.')}`;
};

/** A connected target, with the domains the collectors need already enabled. */
export type Attached = {
  info: TargetInfo;
  name: string;
  kind: TargetKind;
  cdp: Cdp;
  /**
   * Whether this realm has the `Performance` domain, which only a page does.
   *
   * Verified, not assumed: `Performance.enable` answers `'Performance.enable' wasn't found` on
   * every worker target, so `Performance.getMetrics` cannot attribute worker CPU and a caller that
   * reads it per realm would record zeros that look like an idle worker. Worker CPU comes from the
   * sampling profiler instead (`collectors/profiler.ts`).
   */
  hasPerformanceDomain: boolean;
};

/** Ample for a live realm to answer; a target still listed while it shuts down may never answer. */
const ATTACH_TIMEOUT_MS = 10_000;

const attach = async (info: TargetInfo): Promise<Attached | undefined> => {
  const { type, webSocketDebuggerUrl } = info;
  if (!webSocketDebuggerUrl || !isMeasured(type)) {
    return undefined;
  }
  try {
    const cdp = await Cdp.connect(webSocketDebuggerUrl, { timeoutMs: ATTACH_TIMEOUT_MS });
    // Every measured realm answers `Runtime.evaluate`; one that does not would hang every later read.
    const alive = await cdp.trySend('Runtime.evaluate', { expression: '0' }, { timeoutMs: ATTACH_TIMEOUT_MS });
    if (alive === undefined) {
      cdp.close();
      return undefined;
    }
    await cdp.trySend('HeapProfiler.enable', {}, { timeoutMs: ATTACH_TIMEOUT_MS });
    const performance = await cdp.trySend('Performance.enable', {}, { timeoutMs: ATTACH_TIMEOUT_MS });
    return {
      info,
      name: targetName(info),
      kind: type,
      cdp,
      hasPerformanceDomain: performance !== undefined,
    };
  } catch {
    // A target that went away between enumeration and connect is not a measurement failure.
    return undefined;
  }
};

/**
 * Reconciles the attached set against the targets that exist now, keeping live sessions open.
 *
 * Sessions are long-lived rather than reopened per stage because the profiler and the screencast
 * are stateful across boundaries — closing their socket would discard the in-flight profile. But
 * the SET must still be refreshed: a shared worker can start, hibernate or be replaced mid-flow,
 * and one that appears during stage 2 has to be measured for stage 3.
 */
export const refreshTargets = async (port: number, attached: Attached[]): Promise<Attached[]> => {
  const targets = await listTargets(port);
  const live = new Set(targets.map((target) => target.id));

  const kept: Attached[] = [];
  for (const existing of attached) {
    if (live.has(existing.info.id)) {
      kept.push(existing);
    } else {
      existing.cdp.close();
    }
  }

  const known = new Set(kept.map((existing) => existing.info.id));
  for (const info of targets) {
    if (known.has(info.id)) {
      continue;
    }
    const session = await attach(info);
    if (session) {
      kept.push(session);
    }
  }
  return kept;
};

/** First attachment for a run. */
export const attachAll = (port: number): Promise<Attached[]> => refreshTargets(port, []);

/** Closes every session in the set; the run's own teardown. */
export const detachAll = (attached: Attached[]): void => {
  for (const { cdp } of attached) {
    cdp.close();
  }
};
