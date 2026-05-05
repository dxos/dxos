//
// Copyright 2025 DXOS.org
//

import { Event } from '@dxos/async';
import { Context } from '@dxos/context';
import { type Entity, Query, type QueryResult } from '@dxos/echo';
import { type QueryAST } from '@dxos/echo-protocol';
import { type AnyProperties } from '@dxos/echo/internal';
import { log } from '@dxos/log';

import { canonicalQueryKey } from './canonical-query-key';
import { type QueryContext } from './query-context';

/** Grace period (ms) before stopping an idle underlying context. Absorbs React StrictMode double-mounts. */
const STOP_GRACE_MS = 200;

type SharedEntry<T extends AnyProperties, O extends Entity.Entity<T>> = {
  readonly key: string;
  readonly underlying: QueryContext<T, O>;
  /** Current AST forwarded to the underlying context; undefined until the first attach. */
  currentAst: QueryAST.Query | undefined;
  /** Number of handles that have called start() but not yet stop(). */
  refcount: number;
  /** Whether the underlying context is currently running. */
  isRunning: boolean;
  /** In-flight one-shot run promise; cleared when it settles. */
  inFlight: Promise<QueryResult.EntityEntry<O>[]> | undefined;
  /** Grace-period timer for deferred stop. */
  stopTimer: ReturnType<typeof setTimeout> | undefined;
  /** Total run() calls dispatched to underlying — for diagnostics. */
  lifetimeRuns: number;
};

type CoalescerInternals<T extends AnyProperties, O extends Entity.Entity<T>> = {
  getOrCreateEntry(key: string, ast: QueryAST.Query): SharedEntry<T, O>;
  deleteEntry(key: string): void;
};

/**
 * A handle implementing QueryContext that delegates to a shared underlying context.
 * Multiple handles sharing a canonical key reuse one underlying context instance.
 */
class CoalescedHandle<T extends AnyProperties, O extends Entity.Entity<T>> implements QueryContext<T, O> {
  readonly changed = new Event<void>();

  readonly #internals: CoalescerInternals<T, O>;
  #entry: SharedEntry<T, O> | undefined = undefined;
  #isStarted = false;
  #forwardCtx: Context | undefined = undefined;

  constructor(internals: CoalescerInternals<T, O>) {
    this.#internals = internals;
  }

  update(ast: QueryAST.Query): void {
    const newKey = canonicalQueryKey(ast);
    if (this.#entry?.key === newKey) {
      return;
    }

    // Detach from the old entry (but preserve #isStarted so refcount sync below is correct).
    if (this.#isStarted && this.#entry) {
      this.#decrementRef(this.#entry);
    }
    void this.#forwardCtx?.dispose();
    this.#forwardCtx = undefined;
    this.#entry = undefined;

    // Attach to the new (or existing) shared entry.
    const entry = this.#internals.getOrCreateEntry(newKey, ast);
    this.#entry = entry;

    // Forward AST to underlying only on first attach (entry tracks whether it was set).
    if (entry.currentAst === undefined) {
      entry.currentAst = ast;
      entry.underlying.update(ast);
    }

    // Wire the shared changed event into this handle's own event.
    this.#forwardCtx = new Context();
    entry.underlying.changed.on(this.#forwardCtx, () => this.changed.emit());

    // If this handle was already started (update called after start — rare), sync refcount.
    if (this.#isStarted) {
      this.#incrementRef(entry);
    }
  }

  start(): void {
    if (this.#isStarted) {
      return;
    }
    this.#isStarted = true;
    if (this.#entry) {
      this.#incrementRef(this.#entry);
    }
  }

  stop(): void {
    if (!this.#isStarted) {
      return;
    }
    this.#isStarted = false;
    if (this.#entry) {
      this.#decrementRef(this.#entry);
    }
  }

  getResults(): QueryResult.EntityEntry<O>[] {
    return this.#entry?.underlying.getResults() ?? [];
  }

  async run(ctx: Context, ast: QueryAST.Query, opts?: QueryResult.RunOptions): Promise<QueryResult.EntityEntry<O>[]> {
    const entry = this.#entry;
    if (!entry) {
      return [];
    }

    const key = canonicalQueryKey(ast);
    const timeout = opts?.timeout ?? 30_000;

    // Only coalesce when the run key matches the shared entry key.
    if (key !== entry.key) {
      return entry.underlying.run(ctx, ast, opts);
    }

    if (!entry.inFlight) {
      entry.lifetimeRuns++;
      // Use a fresh context so per-caller ctx cancellations don't abort the shared request.
      entry.inFlight = entry.underlying
        .run(Context.default(), ast, { timeout: Math.max(timeout, 60_000) })
        .finally(() => {
          entry.inFlight = undefined;
        });
    }

    // Per-caller timeout wrapping the shared in-flight promise.
    return new Promise<QueryResult.EntityEntry<O>[]>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Query timed out after ${timeout}ms`)), timeout);
      entry.inFlight!.then(
        (result) => {
          clearTimeout(timer);
          resolve(result);
        },
        (err) => {
          clearTimeout(timer);
          reject(err);
        },
      );
    });
  }

  /** Release all resources held by this handle. */
  dispose(): void {
    if (this.#isStarted) {
      this.stop();
    }
    void this.#forwardCtx?.dispose();
    this.#forwardCtx = undefined;
    this.#entry = undefined;
  }

  #incrementRef(entry: SharedEntry<T, O>): void {
    if (entry.stopTimer !== undefined) {
      clearTimeout(entry.stopTimer);
      entry.stopTimer = undefined;
      log('cancel stop timer', { key: entry.key });
    }
    entry.refcount++;
    if (entry.refcount === 1 && !entry.isRunning) {
      entry.isRunning = true;
      entry.underlying.start();
      log('start underlying', { key: entry.key });
    }
  }

  #decrementRef(entry: SharedEntry<T, O>): void {
    entry.refcount--;
    if (entry.refcount === 0 && entry.isRunning) {
      entry.stopTimer = setTimeout(() => {
        entry.stopTimer = undefined;
        if (entry.refcount === 0) {
          entry.isRunning = false;
          entry.underlying.stop();
          this.#internals.deleteEntry(entry.key);
          log('stop underlying', { key: entry.key });
        }
      }, STOP_GRACE_MS);
      log('schedule stop', { key: entry.key, graceMs: STOP_GRACE_MS });
    }
  }
}

/**
 * Coalesces identical queries (same canonical key) into a single underlying QueryContext.
 * Multiple handles for the same key share one underlying context instance and lifecycle.
 *
 * @example
 * ```ts
 * const coalescer = new QueryContextCoalescer(() => new GraphQueryContext(...));
 * const handle = coalescer.getOrCreate(ast);
 * // pass handle to QueryResultImpl instead of a fresh context
 * ```
 */
export class QueryContextCoalescer<
  T extends AnyProperties = AnyProperties,
  O extends Entity.Entity<T> = Entity.Entity<T>,
> {
  readonly #entries = new Map<string, SharedEntry<T, O>>();
  readonly #factory: () => QueryContext<T, O>;
  readonly #internals: CoalescerInternals<T, O>;
  #disposed = false;

  constructor(factory: () => QueryContext<T, O>) {
    this.#factory = factory;
    this.#internals = {
      getOrCreateEntry: (key, ast) => this.#getOrCreateEntry(key, ast),
      deleteEntry: (key) => this.#deleteEntry(key),
    };
  }

  /** Returns a handle that shares an underlying context with any other handle for the same canonical key. */
  getOrCreate(ast: QueryAST.Query): QueryContext<T, O> {
    const handle = new CoalescedHandle<T, O>(this.#internals);
    handle.update(ast);
    return handle;
  }

  /** Diagnostic snapshot of currently active shared entries. */
  get diagnostics(): CoalescerDiagnostic[] {
    return Array.from(this.#entries.values()).map((entry) => ({
      canonicalKey: entry.key,
      queryPretty: entry.currentAst ? Query.pretty(Query.fromAst(entry.currentAst)) : '',
      refcount: entry.refcount,
      isRunning: entry.isRunning,
      hasInflight: entry.inFlight !== undefined,
      lifetimeRuns: entry.lifetimeRuns,
    }));
  }

  /** Tear down all shared entries. Call when the parent database or queue closes. */
  dispose(): void {
    if (this.#disposed) {
      return;
    }
    this.#disposed = true;
    for (const entry of this.#entries.values()) {
      if (entry.stopTimer !== undefined) {
        clearTimeout(entry.stopTimer);
      }
      if (entry.isRunning) {
        entry.underlying.stop();
      }
    }
    this.#entries.clear();
  }

  #getOrCreateEntry(key: string, _ast: QueryAST.Query): SharedEntry<T, O> {
    let entry = this.#entries.get(key);
    if (!entry) {
      entry = {
        key,
        underlying: this.#factory(),
        currentAst: undefined,
        refcount: 0,
        isRunning: false,
        inFlight: undefined,
        stopTimer: undefined,
        lifetimeRuns: 0,
      };
      this.#entries.set(key, entry);
      log('create shared entry', { key });
    }
    return entry;
  }

  #deleteEntry(key: string): void {
    this.#entries.delete(key);
    log('delete shared entry', { key });
  }
}

export type CoalescerDiagnostic = {
  canonicalKey: string;
  queryPretty: string;
  refcount: number;
  isRunning: boolean;
  hasInflight: boolean;
  lifetimeRuns: number;
};
