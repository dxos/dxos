//
// Copyright 2022 DXOS.org
//

import { Event } from '@dxos/async';
import { StackTrace } from '@dxos/debug';
import { compositeRuntime } from '@dxos/echo-signals/runtime';
import { invariant } from '@dxos/invariant';
import { type PublicKey, type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { trace } from '@dxos/tracing';
import { nonNullable } from '@dxos/util';

import { prohibitSignalActions } from '../guarded-scope';
import { type Filter } from './filter';

// TODO(burdon): Multi-sort option.
export type Sort<T extends {}> = (a: T, b: T) => -1 | 0 | 1;

// TODO(burdon): Change to SubscriptionHandle.
export type Subscription = () => void;

export type QueryResult<T extends {} = any> = {
  id: string;

  spaceId: SpaceId;

  /** @deprecated Use spaceId */
  spaceKey: PublicKey;

  /**
   * May not be present for remote results.
   */
  object?: T;

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
  objects: T[];
};

export interface QueryContext {
  getResults(): QueryResult[];

  // TODO(dmaretskyi): Update info?
  changed: Event<void>;

  /**
   * One-shot query.
   */
  run(filter: Filter, opts?: QueryRunOptions): Promise<QueryResult[]>;

  /**
   * Set the filter and trigger continuous updates.
   */
  update(filter: Filter): void;

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

export type QueryRunOptions = {
  timeout?: number;
};

/**
 * Predicate based query.
 */
export class Query<T extends {} = any> {
  private readonly _filter: Filter;
  private readonly _signal = compositeRuntime.createSignal();
  private readonly _event = new Event<Query<T>>();
  private readonly _diagnostic: QueryDiagnostic;

  private _isActive = false;
  private _resultCache: QueryResult<T>[] | undefined = undefined;
  private _objectCache: T[] | undefined = undefined;
  private _subscribers: number = 0;

  constructor(
    private readonly _queryContext: QueryContext,
    filter: Filter,
  ) {
    this._filter = filter;

    this._queryContext.changed.on(() => {
      this._resultCache = undefined;
      this._objectCache = undefined;
      // Clear `prohibitSignalActions` to allow the signal to be emitted.
      compositeRuntime.untracked(() => {
        this._event.emit(this);
        this._signal.notifyWrite();
      });
    });
    this._queryContext.update(filter);

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

  get objects(): T[] {
    this._checkQueryIsRunning();
    this._signal.notifyRead();
    this._ensureCachePresent();
    return this._objectCache!;
  }

  async run(timeout: { timeout: number } = { timeout: 30_000 }): Promise<OneShotQueryResult<T>> {
    const filteredResults = await this._queryContext.run(this._filter, { timeout: timeout.timeout });
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
          this._resultCache = this._queryContext.getResults();
          this._objectCache = this._uniqueObjects(this._resultCache);
        });
      });
    }
  }

  private _uniqueObjects(results: QueryResult<T>[]): T[] {
    const seen = new Set<unknown>();
    return results
      .map((result) => result.object)
      .filter(nonNullable)
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

  private _handleQueryLifecycle() {
    if (this._subscribers === 0 && this._isActive) {
      log('stop query', { filter: this._filter.toProto() });
      this._stop();
    } else if (this._subscribers > 0 && !this._isActive) {
      log('start query', { filter: this._filter.toProto() });
      this._start();
    }
  }

  private _start() {
    if (!this._isActive) {
      this._isActive = true;
      this._queryContext.start();
      this._diagnostic.isActive = true;
    }
  }

  private _stop() {
    if (this._isActive) {
      this._queryContext.stop();
      this._isActive = true;
      this._diagnostic.isActive = false;
    }
  }

  private _checkQueryIsRunning() {
    if (!this._isActive) {
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
