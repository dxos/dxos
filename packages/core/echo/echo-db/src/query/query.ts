//
// Copyright 2022 DXOS.org
//

import { asyncTimeout, Event, TimeoutError } from '@dxos/async';
import { Context } from '@dxos/context';
import { StackTrace } from '@dxos/debug';
import { type EchoReactiveObject } from '@dxos/echo-schema';
import { compositeRuntime } from '@dxos/echo-signals/runtime';
import { invariant } from '@dxos/invariant';
import { type PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { trace } from '@dxos/tracing';
import { nonNullable } from '@dxos/util';

import { filterMatch, type Filter } from './filter';
import { getAutomergeObjectCore } from '../automerge';
import { prohibitSignalActions } from '../guarded-scope';

// TODO(burdon): Multi-sort option.
export type Sort<T extends EchoReactiveObject<any>> = (a: T, b: T) => -1 | 0 | 1;

// TODO(burdon): Change to SubscriptionHandle.
export type Subscription = () => void;

export type QueryResult<T extends {} = any> = {
  id: string;
  spaceKey: PublicKey;

  /**
   * May not be present for remote results.
   */
  object?: EchoReactiveObject<T>;

  match?: {
    // TODO(dmaretskyi): text positional info.

    /**
     * Higher means better match.
     */
    rank: number;
  };

  /**
   * Query resolution metadata.
   */
  resolution?: {
    // TODO(dmaretskyi): Make this more generic.
    source: 'remote' | 'local' | 'index';

    /**
     * Query resolution time in milliseconds.
     */
    time: number;
  };
};

export type OneShotQueryResult<T extends {} = any> = {
  results: QueryResult<T>[];
  objects: EchoReactiveObject<T>[];
};

/**
 * Query data source.
 * Implemented by a space or a remote agent.
 * Each query has a separate instance.
 */
export interface QuerySource {
  getResults(): QueryResult[];

  // TODO(dmaretskyi): Update info?
  changed: Event<void>;

  /**
   * One-shot query.
   */
  run(filter: Filter): Promise<QueryResult[]>;

  /**
   * Set the filter and trigger continuous updates.
   */
  update(filter: Filter): void;

  // TODO(dmaretskyi): Make async.
  close(): void;
}

export interface QueryContext {
  added: Event<QuerySource>;
  removed: Event<QuerySource>;

  sources: QuerySource[];

  /**
   * Start creating query sources and firing events.
   *
   * `start` and `stop` are re-entrant.
   */
  // TODO(dmaretskyi): Make async.
  start(): void;

  /**
   * Clear any resources associated with the query.
   *
   * `start` and `stop` are re-entrant.
   */
  // TODO(dmaretskyi): Make async.
  stop(): void;
}

export type QuerySubscriptionOptions = {
  /**
   * Fire the callback immediately.
   */
  fire?: boolean;
};

/**
 * Predicate based query.
 */
export class Query<T extends {} = any> {
  private readonly _filter: Filter;
  private readonly _sources = new Set<QuerySource>();
  private readonly _signal = compositeRuntime.createSignal();
  private readonly _event = new Event<Query<T>>();

  private _runningCtx: Context | null = null;
  private _resultCache: QueryResult<T>[] | undefined = undefined;
  private _objectCache: EchoReactiveObject<T>[] | undefined = undefined;
  private _subscribers: number = 0;

  private readonly _diagnostic: QueryDiagnostic;

  constructor(
    private readonly _queryContext: QueryContext,
    filter: Filter,
  ) {
    this._filter = filter;

    this._queryContext.sources.forEach((s) => this._sources.add(s));
    this._queryContext.added.on((source) => {
      if (this._sources.has(source)) {
        return;
      }
      this._sources.add(source);
      if (this._runningCtx != null) {
        this._subscribeToSourceUpdates(this._runningCtx, source);
      }
    });

    this._queryContext.removed.on((source) => {
      source.close();
      this._sources.delete(source);
    });

    this._diagnostic = {
      isActive: this._isActive,
      filter: JSON.stringify(this._filter),
      creationStack: new StackTrace(),
    };
    QUERIES.add(this._diagnostic);

    log('construct', { filter: this._filter.toProto() });
  }

  get filter(): Filter {
    return this._filter;
  }

  get results(): QueryResult<T>[] {
    this._checkQueryIsRunning();
    this._signal.notifyRead();
    this._ensureCachePresent();
    return this._resultCache!;
  }

  get objects(): EchoReactiveObject<T>[] {
    this._checkQueryIsRunning();
    this._signal.notifyRead();
    this._ensureCachePresent();
    return this._objectCache!;
  }

  /**
   * @internal
   */
  get _isActive(): boolean {
    return this._runningCtx != null;
  }

  async run(timeout: { timeout: number } = { timeout: 1000 }): Promise<OneShotQueryResult<T>> {
    const filter = this._filter;
    const runTasks = [...this._sources.values()].map(async (s) => {
      try {
        return await asyncTimeout(s.run(filter), timeout.timeout);
      } catch (err) {
        if (!(err instanceof TimeoutError)) {
          log.catch(err);
        }
      }
    });
    if (runTasks.length === 0) {
      return { objects: [], results: [] };
    }

    const mergedResults = (await Promise.all(runTasks)).flatMap((r) => r ?? []);
    const filteredResults = this._filterResults(filter, mergedResults);
    return {
      results: filteredResults,
      objects: this._uniqueObjects(filteredResults),
    };
  }

  /**
   * Subscribe to query results.
   * Queries that have at least one subscriber are updated reactively when the underlying data changes.
   */
  // TODO(burdon): Change to SubscriptionHandle (make uniform).
  subscribe(callback?: (query: Query<T>) => void, opts?: QuerySubscriptionOptions): Subscription {
    invariant(!(!callback && opts?.fire), 'Cannot fire without a callback.');

    log('subscribe');
    this._subscribers++;
    const unsubscribeFromEvent = callback ? this._event.on(callback) : undefined;
    this._handleQueryLifecycle();

    const unsubscribe = () => {
      log('unsubscribe');
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

  private _ensureCachePresent() {
    if (!this._resultCache) {
      prohibitSignalActions(() => {
        // TODO(dmaretskyi): Clean up getters in the internal signals so they don't use the Proxy API and don't hit the signals.
        compositeRuntime.untracked(() => {
          this._resultCache = this._filterResults(
            this._filter,
            Array.from(this._sources).flatMap((source) => source.getResults()),
          );
          this._objectCache = this._uniqueObjects(this._resultCache);
        });
      });
    }
  }

  private _filterResults(filter: Filter, results: QueryResult[]): QueryResult<T>[] {
    return results.filter(
      (result) => result.object && filterMatch(filter, getAutomergeObjectCore(result.object), result.object),
    );
  }

  private _uniqueObjects(results: QueryResult<T>[]): EchoReactiveObject<T>[] {
    const seen = new Set<string>();
    return results
      .map((result) => result.object)
      .filter(nonNullable)
      .filter((object) => {
        if (seen.has(object.id)) {
          return false;
        }
        seen.add(object.id);
        return true;
      });
  }

  private _handleQueryLifecycle() {
    if (this._subscribers === 0 && this._runningCtx != null) {
      log('stop query', { filter: this._filter.toProto() });
      this._stop();
    } else if (this._subscribers > 0 && this._runningCtx == null) {
      log('start query', { filter: this._filter.toProto() });
      this._start();
    }
  }

  private _start() {
    if (this._runningCtx == null) {
      this._runningCtx = new Context({
        onError: (err) => {
          log.catch(err);
        },
      });
      this._queryContext.start();
      for (const source of this._sources) {
        this._subscribeToSourceUpdates(this._runningCtx, source);
      }
      this._diagnostic.isActive = true;
    }
  }

  private _stop() {
    if (this._runningCtx) {
      void this._runningCtx.dispose()?.catch();
      this._queryContext.stop();
      this._runningCtx = null;
      this._diagnostic.isActive = false;
    }
  }

  private _subscribeToSourceUpdates(ctx: Context, source: QuerySource) {
    source.changed.on(ctx, () => {
      this._resultCache = undefined;
      this._objectCache = undefined;
      // Clear `prohibitSignalActions` to allow the signal to be emitted.
      compositeRuntime.untracked(() => {
        this._event.emit(this);
        this._signal.notifyWrite();
      });
    });
    source.update(this._filter);
  }

  private _checkQueryIsRunning() {
    if (this._runningCtx == null) {
      throw new Error(
        'Query must have at least 1 subscriber for `.objects` and `.results` to be used. Use query.run() for single-use result retrieval.',
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
