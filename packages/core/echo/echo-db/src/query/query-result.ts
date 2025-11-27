//
// Copyright 2022 DXOS.org
//

import { type CleanupFn, Event } from '@dxos/async';
import { StackTrace } from '@dxos/debug';
import { type Entity, type QueryResult } from '@dxos/echo';
import { compositeRuntime } from '@dxos/echo-signals/runtime';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { trace } from '@dxos/tracing';
import { isNonNullable } from '@dxos/util';

import { prohibitSignalActions } from '../guarded-scope';

import { type Query } from './api';
import { type QueryContext } from './query-context';

/**
 * Predicate based query.
 */
export class QueryResultImpl<T extends Entity.Unknown = Entity.Unknown> implements QueryResult.QueryResult<T> {
  private readonly _signal = compositeRuntime.createSignal();
  private readonly _event = new Event<QueryResult.QueryResult<T>>();
  private readonly _diagnostic: QueryDiagnostic;

  private _isActive = false;
  private _resultCache?: QueryResult.EntityEntry<T>[] = undefined;
  private _objectCache?: T[] = undefined;
  private _subscribers: number = 0;

  constructor(
    private readonly _queryContext: QueryContext<T>,
    private readonly _query: Query<T>,
  ) {
    this._queryContext.changed.on(() => {
      if (this._recomputeResult()) {
        // Clear `prohibitSignalActions` to allow the signal to be emitted.
        compositeRuntime.untracked(() => {
          this._event.emit(this);
          this._signal.notifyWrite();
        });
      }
    });

    this._queryContext.update(this._query.ast);

    this._diagnostic = {
      isActive: this._isActive,
      filter: JSON.stringify(this._query),
      creationStack: new StackTrace(),
    };
    QUERIES.add(this._diagnostic);

    log('construct', { filter: this._query.ast });
  }

  get query(): Query<T> {
    return this._query;
  }

  get entries(): QueryResult.EntityEntry<T>[] {
    this._checkQueryIsRunning();
    this._signal.notifyRead();
    this._ensureCachePresent();
    return this._resultCache!;
  }

  get results(): T[] {
    this._checkQueryIsRunning();
    this._signal.notifyRead();
    this._ensureCachePresent();
    return this._objectCache!;
  }

  /**
   * Execute the query once and return the results.
   * Does not subscribe to updates.
   */
  async run(opts?: { timeout?: number }): Promise<T[]> {
    const filteredResults = await this._queryContext.run(this._query.ast, {
      timeout: opts?.timeout ?? 30_000,
    });
    return this._uniqueObjects(filteredResults);
  }

  /**
   * Execute the query once and return the entries with match metadata.
   * Does not subscribe to updates.
   */
  async runEntries(opts?: { timeout?: number }): Promise<QueryResult.EntityEntry<T>[]> {
    const filteredResults = await this._queryContext.run(this._query.ast, {
      timeout: opts?.timeout ?? 30_000,
    });
    return filteredResults;
  }

  async first(opts?: { timeout?: number }): Promise<T> {
    const objects = await this.run(opts);
    if (objects.length === 0) {
      throw new Error('No objects found');
    }

    return objects[0];
  }

  async firstOrUndefined(opts?: { timeout?: number }): Promise<T | undefined> {
    const objects = await this.run(opts);
    return objects.at(0);
  }

  /**
   * Runs the query synchronously and returns all results.
   * WARNING: This method will only return the data already cached and may return incomplete results.
   * Use `this.run()` for a complete list of results stored on-disk.
   */
  runSync(): T[] {
    this._ensureCachePresent();
    return this._objectCache!;
  }

  /**
   * Runs the query synchronously and returns all entries with match metadata.
   * WARNING: This method will only return the data already cached and may return incomplete results.
   * Use `this.runEntries()` for a complete list of entries stored on-disk.
   */
  runSyncEntries(): QueryResult.EntityEntry<T>[] {
    this._ensureCachePresent();
    return this._resultCache!;
  }

  /**
   * Subscribe to query results.
   * Updates only when the identity or the order of the objects changes.
   * Does not update when the object properties change.
   */
  // TODO(burdon): Change to SubscriptionHandle (make uniform).
  subscribe(callback?: (query: QueryResult.QueryResult<T>) => void, opts?: QueryResult.SubscriptionOptions): CleanupFn {
    invariant(!(!callback && opts?.fire), 'Cannot fire without a callback.');

    log('subscribe', { filter: this._query.ast, active: this._isActive });
    this._subscribers++;
    const unsubscribeFromEvent = callback ? this._event.on(callback) : undefined;
    this._handleQueryLifecycle();

    const unsubscribe = () => {
      log('unsubscribe', { filter: this._query.ast, active: this._isActive });
      this._subscribers--;
      unsubscribeFromEvent?.();
      this._handleQueryLifecycle();
    };

    if (callback && opts?.fire) {
      try {
        callback(this);
      } catch (err) {
        unsubscribe();
        throw err;
      }
    }

    return unsubscribe;
  }

  private _ensureCachePresent(): void {
    if (!this._resultCache) {
      prohibitSignalActions(() => {
        // TODO(dmaretskyi): Clean up getters in the internal signals so they don't use the Proxy API and don't hit the signals.
        compositeRuntime.untracked(() => {
          this._recomputeResult();
        });
      });
    }
  }

  /**
   * @returns true if the result cache was updated.
   */
  private _recomputeResult(): boolean {
    // TODO(dmaretskyi): Make results unique too.
    const results = this._queryContext.getResults();
    const objects = this._uniqueObjects(results);

    const changed =
      !this._objectCache ||
      this._objectCache.length !== objects.length ||
      this._objectCache.some((obj, index) => obj.id !== objects[index].id);

    log('recomputeResult', {
      old: this._objectCache?.map((obj) => obj.id),
      new: objects.map((obj) => obj.id),
      changed,
    });

    this._resultCache = results;
    this._objectCache = objects;
    return changed;
  }

  private _uniqueObjects(results: QueryResult.EntityEntry<T>[]): T[] {
    const seen = new Set<unknown>();
    return results
      .map((result) => result.result)
      .filter(isNonNullable)
      .filter((object: any) => {
        // Assuming objects have `id` property we can use to dedup.
        if (object.id == null) {
          return true;
        }

        if (seen.has(object.id)) {
          return false;
        }
        seen.add(object.id);
        return true;
      });
  }

  private _handleQueryLifecycle(): void {
    if (this._subscribers === 0 && this._isActive) {
      log('stop query', { filter: this._query.ast });
      this._stop();
    } else if (this._subscribers > 0 && !this._isActive) {
      log('start query', { filter: this._query.ast });
      this._start();
    }
  }

  private _start(): void {
    this._isActive = true;
    this._queryContext.start();
    this._diagnostic.isActive = true;
  }

  private _stop(): void {
    this._queryContext.stop();
    this._isActive = false;
    this._diagnostic.isActive = false;
  }

  private _checkQueryIsRunning(): void {
    if (!this._isActive) {
      throw new Error(
        'Query must have at least 1 subscriber for `.results` and `.entries` to be used. Use query.run() for single-use result retrieval.',
      );
    }
  }
}

// NOTE: Make sure this doesn't keep references to the queries so that they can be garbage collected.
type QueryDiagnostic = {
  isActive: boolean;
  filter: string;
  creationStack: StackTrace;
};

const QUERIES = new Set<QueryDiagnostic>();

trace.diagnostic({
  id: 'client-queries',
  name: 'Queries (Client)',
  fetch: () => {
    return Array.from(QUERIES).map((query) => {
      return {
        isActive: query.isActive,
        filter: query.filter,
        creationStack: query.creationStack.getStack(),
      };
    });
  },
});
