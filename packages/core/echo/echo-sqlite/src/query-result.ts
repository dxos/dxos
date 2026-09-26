//
// Copyright 2026 DXOS.org
//

import * as Atom from 'effect/unstable/reactivity/Atom';

import { type CleanupFn, type ReadOnlyEvent } from '@dxos/async';
import { type Entity, type QueryResult } from '@dxos/echo';
import { log } from '@dxos/log';

/**
 * A query result backed by an asynchronous executor (a compiled SQL statement).
 *
 * `run()` executes; the synchronous accessors return the most recent execution and schedule one when
 * there is none, so they never block on SQL and never scan anything. Subscribers re-execute after each
 * `invalidated` signal that could affect them and are notified only when result membership or order
 * changes.
 */
export class LiveQueryResult<T> implements QueryResult.QueryResult<T> {
  readonly #execute: () => Promise<Entity.Unknown[]>;
  readonly #invalidated: ReadOnlyEvent<ReadonlySet<string>>;
  readonly #affectedBy: (typenames: ReadonlySet<string>) => boolean;
  readonly #source: QueryResult.Source;
  readonly #listeners = new Set<(query: QueryResult.QueryResult<T>) => void>();
  #results: Entity.Unknown[] | undefined;
  #pending: Promise<void> | undefined;
  #stale = false;
  #unsubscribe: CleanupFn | undefined;
  #atom: Atom.Atom<T[]> | undefined;

  constructor(options: {
    execute: () => Promise<Entity.Unknown[]>;
    /** Fires with the type DXNs of each committed write batch. */
    invalidated: ReadOnlyEvent<ReadonlySet<string>>;
    /** Whether a batch touching these types could change the result; defaults to always. */
    affectedBy?: (typenames: ReadonlySet<string>) => boolean;
    source: QueryResult.Source;
  }) {
    this.#execute = options.execute;
    this.#invalidated = options.invalidated;
    this.#affectedBy = options.affectedBy ?? (() => true);
    this.#source = options.source;
  }

  get entries(): QueryResult.Entry<T>[] {
    return this.runSyncEntries();
  }

  get results(): T[] {
    return this.runSync();
  }

  get atom(): Atom.Atom<T[]> {
    this.#atom ??= Atom.make((get) => {
      get.addFinalizer(this.subscribe(() => get.setSelf(this.runSync())));
      return this.runSync();
    });
    return this.#atom;
  }

  async run(): Promise<T[]> {
    return (await this.runEntries()).flatMap((entry) => (entry.result === undefined ? [] : [entry.result]));
  }

  async runEntries(): Promise<QueryResult.Entry<T>[]> {
    await this.#refresh();
    return this.runSyncEntries();
  }

  runSync(): T[] {
    return this.runSyncEntries().flatMap((entry) => (entry.result === undefined ? [] : [entry.result]));
  }

  runSyncEntries(): QueryResult.Entry<T>[] {
    if (this.#results === undefined) {
      void this.#refresh().catch((error) => log.catch(error));
      return [];
    }
    return this.#results.map((entity) => ({
      id: entity.id,
      // The query AST constrains the result type; the executor only knows `Entity.Unknown`.
      result: entity as T,
      resolution: { source: this.#source, time: 0 },
    }));
  }

  async first(): Promise<T> {
    const [first] = await this.run();
    if (first === undefined) {
      throw new Error('No results');
    }
    return first;
  }

  async firstOrUndefined(): Promise<T | undefined> {
    return (await this.run())[0];
  }

  subscribe(callback?: (query: QueryResult.QueryResult<T>) => void, opts?: QueryResult.SubscriptionOptions): CleanupFn {
    const listener = callback ?? (() => {});
    this.#listeners.add(listener);
    if (this.#listeners.size === 1) {
      this.#unsubscribe = this.#invalidated.on((typenames) => {
        if (this.#affectedBy(typenames)) {
          void this.#refresh().catch((error) => log.catch(error));
        }
      });
      void this.#refresh().catch((error) => log.catch(error));
    }
    if (opts?.fire) {
      listener(this);
    }
    return () => {
      this.#listeners.delete(listener);
      if (this.#listeners.size === 0) {
        this.#unsubscribe?.();
        this.#unsubscribe = undefined;
      }
    };
  }

  /**
   * Executes and notifies listeners if the result list changed. A call made while an execution is in
   * flight marks it stale instead of starting another, and the in-flight loop runs once more, so a
   * write that lands mid-execution is never missed.
   */
  #refresh(): Promise<void> {
    if (this.#pending) {
      this.#stale = true;
      return this.#pending;
    }
    this.#pending = (async () => {
      do {
        this.#stale = false;
        const next = await this.#execute();
        // "No results yet" reads as empty through the sync accessors, so it is the baseline.
        const previous = this.#results ?? [];
        this.#results = next;
        if (previous.length !== next.length || next.some((item, index) => item !== previous[index])) {
          this.#listeners.forEach((listener) => listener(this));
        }
      } while (this.#stale);
    })().finally(() => {
      this.#pending = undefined;
    });
    return this.#pending;
  }
}
