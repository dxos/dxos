//
// Copyright 2022 DXOS.org
//

import { Event } from '@dxos/async';
import { Context } from '@dxos/context';
import { type PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import { type Filter } from './filter';
import { type EchoObject, type TypedObject } from '../object';
import { compositeRuntime } from '../util';

// TODO(burdon): Reconcile with echo-db/database/selection.

// TODO(burdon): Multi-sort option.
export type Sort<T extends TypedObject> = (a: T, b: T) => -1 | 0 | 1;

// TODO(burdon): Change to SubscriptionHandle.
export type Subscription = () => void;

// TODO(burdon): Fix garbage collection.
const queries: Query<any>[] = [];

export type QueryResult<T extends EchoObject> = {
  id: string;
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
    source: 'remote' | 'local';

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
  getResults(): QueryResult<EchoObject>[];

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
   */
  start(): void;

  // Deliberately no stop() method so that query contexts can be garbage collected automatically.
}

/**
 * Predicate based query.
 */
export class Query<T extends TypedObject = TypedObject> {
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
  private _objectCache: T[] | undefined = undefined;

  constructor(private readonly _queryContext: QueryContext, filter: Filter) {
    this._filter = filter;

    this._queryContext.added.on((source) => {
      this._sources.add(source);
      source.changed.on(this._ctx, () => {
        this._resultCache = undefined;
        this._objectCache = undefined;
        this._signal.notifyWrite();
        this._event.emit(this);
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

  get objects(): T[] {
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
      this._resultCache = Array.from(this._sources).flatMap((source) => source.getResults()) as QueryResult<T>[];
      this._objectCache = this._resultCache.map((result) => result.object!).filter((object): object is T => !!object);
    }
  }

  // TODO(burdon): Change to SubscriptionHandle (make uniform).
  subscribe(callback: (query: Query<T>) => void, fire = false): Subscription {
    queries.push(this);
    log('subscribe', queries.length); // TODO(burdon): Assign id?

    const subscription = this._event.on(callback);
    if (fire) {
      callback(this);
    }

    return () => {
      queries.splice(queries.indexOf(this), 1);
      log.info('unsubscribe', queries.length);
      subscription();
    };
  }
}
