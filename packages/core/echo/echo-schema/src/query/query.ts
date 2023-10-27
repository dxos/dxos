//
// Copyright 2022 DXOS.org
//

import { Event } from '@dxos/async';
import { Context } from '@dxos/context';
import { type Reference } from '@dxos/document-model';
import { invariant } from '@dxos/invariant';
import { type PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import { ShowDeletedOption, type Filter, QUERY_ALL_MODELS } from './filter';
import { base, type EchoObject } from '../defs';
import { getDatabaseFromObject } from '../object';
import { isTypedObject, type TypedObject } from '../object';
import { createSignal } from '../util';

// TODO(burdon): Test suite.
// TODO(burdon): Reconcile with echo-db/database/selection.

// TODO(burdon): Multi-sort option.
export type Sort<T extends TypedObject> = (a: T, b: T) => -1 | 0 | 1;

// TODO(burdon): Change to SubscriptionHandle.
export type Subscription = () => void;

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
  private _sources = new Set<QuerySource>();
  private _resultCache: QueryResult<T>[] | undefined = undefined;
  private _objectCache: T[] | undefined = undefined;
  private _signal = createSignal?.();
  private _event = new Event<Query<T>>();

  constructor(private readonly _queryContext: QueryContext, filter: Filter) {
    this._filter = filter;

    this._queryContext.added.on((source) => {
      this._sources.add(source);
      source.changed.on(() => {
        this._resultCache = undefined;
        this._objectCache = undefined;
        this._signal?.notifyWrite();
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
    this._signal?.notifyRead();
    this._ensureCachePresent();
    return this._resultCache!;
  }

  get objects(): T[] {
    this._signal?.notifyRead();
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

  // TODO(burdon): Change to SubscriptionHandle.
  subscribe(callback: (query: Query<T>) => void, fire = false): Subscription {
    const subscription = this._event.on(callback);
    if (fire) {
      callback(this);
    }

    return subscription;
  }
}

export const filterMatch = (filter: Filter, object: EchoObject) => {
  let result = filterMatchInner(filter, object);

  for (const orFilter of filter.orFilters) {
    if (filterMatch(orFilter, object)) {
      result = true;
      break;
    }
  }

  if (filter.invert) {
    result = !result;
  }

  return result;
};

const filterMatchInner = (filter: Filter, object: EchoObject): boolean => {
  if (isTypedObject(object)) {
    if (object.__deleted) {
      if (filter.showDeletedPreference === ShowDeletedOption.HIDE_DELETED) {
        return false;
      }
    } else {
      if (filter.showDeletedPreference === ShowDeletedOption.SHOW_DELETED_ONLY) {
        return false;
      }
    }
  }

  if (filter.modelFilterPreference !== QUERY_ALL_MODELS) {
    if (!filter.modelFilterPreference.includes(object[base]._modelConstructor.meta.type)) {
      return false;
    }
  }

  if (filter.type) {
    if (!isTypedObject(object)) {
      return false;
    }

    const type = object[base]._getType();

    if (!type) {
      return false;
    }

    if (!compareType(filter.type, type, getDatabaseFromObject(object)?._backend.spaceKey)) {
      return false;
    }
  }

  if (filter.properties) {
    for (const key in filter.properties) {
      invariant(key !== '@type');
      const value = filter.properties[key];
      if ((object as any)[key] !== value) {
        return false;
      }
    }
  }

  if (filter.textMatch !== undefined) {
    throw new Error('Text based search not implemented.');
  }

  if (filter.predicate) {
    if (!filter.predicate(object)) {
      return false;
    }
  }

  for (const andFilter of filter.andFilters) {
    if (!filterMatch(andFilter, object)) {
      return false;
    }
  }

  return true;
};

// Type comparison is a bit weird due to backwards compatibility requirements.
// TODO(dmaretskyi): Deprecate `protobuf` protocol to clean this up.
export const compareType = (expected: Reference, actual: Reference, spaceKey?: PublicKey) => {
  const host = actual.protocol !== 'protobuf' ? actual?.host ?? spaceKey?.toHex() : actual.host ?? 'dxos.org';

  if (
    actual.itemId !== expected.itemId ||
    actual.protocol !== expected.protocol ||
    (host !== expected.host && actual.host !== expected.host)
  ) {
    return false;
  } else {
    return true;
  }
};
