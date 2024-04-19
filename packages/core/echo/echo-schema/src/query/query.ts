//
// Copyright 2022 DXOS.org
//

import { Event } from '@dxos/async';
import { Context } from '@dxos/context';
import { compositeRuntime } from '@dxos/echo-signals/runtime';
import { type PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { nonNullable } from '@dxos/util';

import { filterMatch, type Filter } from './filter';
import { getAutomergeObjectCore } from '../automerge';
import { type EchoReactiveObject } from '../ddl';
import { prohibitSignalActions } from '../guarded-scope';
import { UndefinedKeyword } from '@effect/schema/AST';
import { invariant } from '@dxos/invariant';

// TODO(burdon): Reconcile with echo-db/database/selection.

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
   * Set the filter and trigger the query.
   */
  update(filter: Filter): void;
}

export interface QueryContext {
  added: Event<QuerySource>;
  removed: Event<QuerySource>;

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
  private readonly _ctx = new Context({
    onError: (err) => {
      log.catch(err);
    },
  });

  private readonly _filter: Filter;
  private readonly _sources = new Set<QuerySource>();
  private readonly _signal = compositeRuntime.createSignal();
  private readonly _event = new Event<Query<T>>();

  private _resultCache: QueryResult<T>[] | undefined = undefined;
  private _objectCache: EchoReactiveObject<T>[] | undefined = undefined;
  private _subscribers: number = 0;
  private _isRunning = false;

  constructor(
    private readonly _queryContext: QueryContext,
    filter: Filter,
  ) {
    this._filter = filter;

    this._queryContext.added.on((source) => {
      this._sources.add(source);
      source.changed.on(this._ctx, () => {
        this._resultCache = undefined;
        this._objectCache = undefined;

        // Clear `prohibitSignalActions` to allow the signal to be emitted.
        compositeRuntime.untracked(() => {
          this._signal.notifyWrite();
          this._event.emit(this);
        });
      });
      source.update(this._filter);
    });

    this._queryContext.removed.on((source) => {
      this._sources.delete(source);
    });

    this._queryContext.start();
  }

  get filter(): Filter {
    return this._filter;
  }

  get results(): QueryResult<T>[] {
    this._signal.notifyRead();
    this._ensureCachePresent();
    return this._resultCache!;
  }

  get objects(): EchoReactiveObject<T>[] {
    this._signal.notifyRead();
    this._ensureCachePresent();
    return this._objectCache!;
  }

  /**
   * Resend query to remote agents.
   */
  update() {
    for (const source of this._sources) {
      source.update(this._filter);
    }
  }

  private _ensureCachePresent() {
    if (!this._resultCache) {
      prohibitSignalActions(() => {
        // TODO(dmaretskyi): Clean up getters in the internal signals so they don't use the Proxy API and don't hit the signals.
        compositeRuntime.untracked(() => {
          const seen = new Set<string>();
          this._resultCache = Array.from(this._sources)
            .flatMap((source) => source.getResults())
            .filter(
              (result) => result.object && filterMatch(this._filter, getAutomergeObjectCore(result.object)),
            ) as QueryResult<T>[];
          this._objectCache = this._resultCache
            .map((result) => result.object)
            .filter(nonNullable)
            .filter((object) => {
              // TODO(burdon): Dedupe?
              if (seen.has(object.id)) {
                return false;
              }
              seen.add(object.id);
              return true;
            });
        });
      });
    }
  }

  private _handleQueryLifecycle() {
    if (this._subscribers === 0 && this._isRunning) {
      this._queryContext.stop();
    } else if (this._subscribers > 0 && !this._isRunning) {
      this._queryContext.start();
    }
  }

  /**
   * Subscribe to query results.
   * Queries that have at least one subscriber are updated reactively when the underlying data changes.
   */
  // TODO(burdon): Change to SubscriptionHandle (make uniform).
  subscribe(callback?: (query: Query<T>) => void, opts?: QuerySubscriptionOptions): Subscription {
    invariant(!(!callback && opts?.fire), 'Cannot fire without a callback.');

    this._subscribers++;
    const unsubscribeFromEvent = callback ? this._event.on(callback) : undefined;
    this._handleQueryLifecycle();

    const unsubscribe = () => {
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
}
