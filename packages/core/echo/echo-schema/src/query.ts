//
// Copyright 2022 DXOS.org
//

import { Event } from '@dxos/async';
import { Item, QueryOptions, ShowDeletedOption } from '@dxos/echo-db';

import { EchoObject } from './object';
import { isTypedObject, TypedObject } from './typed-object';

// TODO(burdon): Test suite.
// TODO(burdon): Reconcile with echo-db/database/selection.
// TODO(burdon): Compound filter (e.g., with options).
export type PropertiesFilter = Record<string, any>;
export type OperatorFilter<T extends TypedObject> = (object: T) => boolean;
export type Filter<T extends TypedObject> = PropertiesFilter | OperatorFilter<T>;

// NOTE: `__phantom` property forces TS type check.
export type TypeFilter<T extends TypedObject> = { __phantom: T } & Filter<T>;

export type Subscription = () => void;

/**
 * Predicate based query.
 */
export class Query<T extends TypedObject = TypedObject> {
  constructor(
    private readonly _objects: Map<string, EchoObject>,
    private readonly _updateEvent: Event<Item[]>,
    private readonly _filter: Filter<any>,
    private readonly _options?: QueryOptions
  ) {}

  private _cache: T[] | undefined;

  get objects(): T[] {
    if (!this._cache) {
      // TODO(burdon): Sort as option.
      this._cache = Array.from(this._objects.values()).filter((obj): obj is T =>
        filterMatcher(obj, this._filter, this._options)
      );
    }

    return this._cache;
  }

  subscribe(callback: (query: Query<T>) => void): Subscription {
    return this._updateEvent.on((updated) => {
      const changed = updated.some((object) => {
        if (this._objects.has(object.id)) {
          const match = filterMatcher(this._objects.get(object.id)!, this._filter, this._options);
          const exists = this._cache?.find((obj) => obj.id === object.id);
          return match || (exists && !match);
        } else {
          return false;
        }
      });

      if (changed) {
        this._cache = undefined;
        callback(this);
      }
    });
  }
}

// TODO(burdon): Create separate test.
const filterMatcher = (object: EchoObject, filter: Filter<any>, options: QueryOptions = {}): object is TypedObject => {
  if (!isTypedObject(object)) {
    return false;
  }

  if (object.__deleted) {
    if (options?.deleted === undefined || options?.deleted === ShowDeletedOption.HIDE_DELETED) {
      return false;
    }
  } else {
    if (options?.deleted === ShowDeletedOption.SHOW_DELETED_ONLY) {
      return false;
    }
  }

  if (typeof filter === 'object' && filter['@type'] && object.__typename !== filter['@type']) {
    return false;
  }

  if (typeof filter === 'function') {
    return filter(object);
  } else if (typeof filter === 'object' && filter !== null) {
    for (const key in filter) {
      if (key === '@type') {
        continue;
      }
      if ((object as any)[key] !== filter[key]) {
        return false;
      }
    }
  }

  return true;
};
