//
// Copyright 2026 DXOS.org
//

import * as Atom from 'effect/reactivity/Atom';

import { type CleanupFn, type ReadOnlyEvent } from '@dxos/async';
import { type Entity, type QueryResult } from '@dxos/echo';
import { log } from '@dxos/log';

/**
 * One result of a query: an entity, keyed by its id, or a record an aggregate built, keyed by its group.
 */
export type ResultItem = {
  readonly key: string;
  readonly value: Entity.Unknown | Record<string, unknown>;
  /** Relevance, higher is better; 1 for a result no text search ranked. */
  readonly rank?: number;
};

/** An entity as a result item. */
export const asItem = (entity: Entity.Unknown, rank?: number): ResultItem => ({ key: entity.id, value: entity, rank });

/**
 * A query result backed by an asynchronous executor (a compiled SQL statement).
 *
 * `run()` executes; the synchronous accessors return the most recent execution and schedule one when
 * there is none, so they never block on SQL and never scan anything. Subscribers re-execute after each
 * `invalidated` signal that could affect them and are notified only when result membership or order
 * changes.
 */
export class LiveQueryResult<T> implements QueryResult.QueryResult<T> {
  readonly #execute: () => Promise<readonly ResultItem[]>;
  readonly #resident: (() => readonly ResultItem[]) | undefined;
  readonly #invalidated: ReadOnlyEvent<ReadonlySet<string>>;
  readonly #affectedBy: (typenames: ReadonlySet<string>) => boolean;
  readonly #source: QueryResult.Source;
  readonly #listeners = new Set<(query: QueryResult.QueryResult<T>) => void>();
  #results: readonly ResultItem[] | undefined;
  /**
   * The derived arrays, held until the next execution replaces `#results`.
   *
   * React's `useSyncExternalStore` compares `getSnapshot()` by identity and throws
   * "Maximum update depth exceeded" if it differs every call, so `@dxos/echo-react`'s `useQuery`
   * requires these accessors to be referentially stable between executions — mapping a fresh array
   * per call is an infinite render loop.
   */
  #entries: QueryResult.Entry<T>[] | undefined;
  /** Returned before the first execution, so a subscriber reading early gets one stable reference. */
  readonly #empty: QueryResult.Entry<T>[] = [];
  #flat: T[] | undefined;
  #pending: Promise<void> | undefined;
  #stale = false;
  #unsubscribe: CleanupFn | undefined;
  #atom: Atom.Atom<T[]> | undefined;
  #answers = 0;

  constructor(options: {
    execute: () => Promise<readonly ResultItem[]>;
    /**
     * The synchronous answer before the first execution: the query matched against the objects
     * already in memory, as echo-client answers `runSync`. The execution then replaces it.
     */
    resident?: () => readonly ResultItem[];
    /** Fires with the type DXNs of each committed write batch. */
    invalidated: ReadOnlyEvent<ReadonlySet<string>>;
    /** Whether a batch touching these types could change the result; defaults to always. */
    affectedBy?: (typenames: ReadonlySet<string>) => boolean;
    source: QueryResult.Source;
  }) {
    this.#execute = options.execute;
    this.#resident = options.resident;
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

  get completeness(): QueryResult.Completeness {
    if (this.#results === undefined) {
      return 'pending';
    }
    return this.#pending ? 'stale' : 'complete';
  }

  get sources(): readonly QueryResult.SourceState[] {
    return [
      { source: this.#source, state: this.#results === undefined ? 'pending' : 'answered', answers: this.#answers },
    ];
  }

  async run(): Promise<T[]> {
    return (await this.runEntries()).flatMap((entry) => (entry.result === undefined ? [] : [entry.result]));
  }

  async runEntries(): Promise<QueryResult.Entry<T>[]> {
    await this.#refresh();
    return this.runSyncEntries();
  }

  runSync(): T[] {
    this.#flat ??= this.runSyncEntries().flatMap((entry) => (entry.result === undefined ? [] : [entry.result]));
    return this.#flat;
  }

  runSyncEntries(): QueryResult.Entry<T>[] {
    if (this.#results === undefined) {
      void this.#refresh().catch((error) => log.catch(error));
      const resident = this.#resident?.();
      if (!resident || resident.length === 0) {
        // Stable, so a subscriber reading before the first execution does not re-render on every call.
        return this.#empty;
      }
      this.#results = resident;
    }
    this.#entries ??= this.#results.map((item) => ({
      id: item.key,
      // The query AST constrains the result type; the executor only knows the item's value.
      result: item.value as T,
      match: { rank: item.rank ?? 1 },
      resolution: { source: this.#source, time: 0 },
    }));
    return this.#entries;
  }

  /**
   * Resolves once no execution is running or scheduled, so a subscriber has seen every commit made
   * before the call.
   */
  async settled(): Promise<void> {
    while (this.#pending) {
      await this.#pending;
    }
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
    let called = false;
    const listener = (query: QueryResult.QueryResult<T>) => {
      called = true;
      callback?.(query);
    };
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
      if (this.#results !== undefined) {
        listener(this);
      } else {
        // Fired with the first results, as echo-client fires, unless they already notified it.
        void this.#refresh()
          .then(() => {
            if (!called && this.#listeners.has(listener)) {
              listener(this);
            }
          })
          .catch((error) => log.catch(error));
      }
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
        this.#entries = undefined;
        this.#flat = undefined;
        this.#answers++;
        if (previous.length !== next.length || next.some((item, index) => item.value !== previous[index].value)) {
          this.#listeners.forEach((listener) => listener(this));
        }
      } while (this.#stale);
    })().finally(() => {
      this.#pending = undefined;
    });
    return this.#pending;
  }
}
