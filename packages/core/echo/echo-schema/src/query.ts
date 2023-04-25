//
// Copyright 2022 DXOS.org
//

import { Event } from '@dxos/async';
import { Item, QueryOptions, ShowDeletedOption } from '@dxos/echo-db';

import { EchoObject } from './object';
import { isTypedObject, TypedObject } from './typed-object';

// TODO(burdon): Test suite.
// TODO(burdon): Reconcile with echo-db/database/selection.

// TODO(burdon): Multi-sort option.
export type Sort<T extends TypedObject> = (a: T, b: T) => -1 | 0 | 1;

// TODO(burdon): Operators (EQ, NE, GT, LT, IN, etc.)
export type PropertyFilter = Record<string, any>;

export type OperatorFilter<T extends TypedObject> = (object: T) => boolean;

export type Filter<T extends TypedObject> = PropertyFilter | OperatorFilter<T>;

export const filterDeleted = (option: ShowDeletedOption) => (object: TypedObject) => {
  if (object.__deleted) {
    if (option === undefined || option === ShowDeletedOption.HIDE_DELETED) {
      return false;
    }
  } else {
    if (option === ShowDeletedOption.SHOW_DELETED_ONLY) {
      return false;
    }
  }

  return true;
};

// NOTE: `__phantom` property forces TS type check.
export type TypeFilter<T extends TypedObject> = { __phantom: T } & Filter<T>;

export type Subscription = () => void;

/**
 * Predicate based query.
 */
export class Query<T extends TypedObject = TypedObject> {
  private readonly _filters: Filter<any>[];

  constructor(
    private readonly _objects: Map<string, EchoObject>,
    private readonly _updateEvent: Event<Item[]>,
    filter: Filter<any> | Filter<any>[],
    private readonly _options?: QueryOptions
  ) {
    this._filters = Array.isArray(filter) ? filter : [filter];
  }

  private _cache: T[] | undefined;

  get objects(): T[] {
    if (!this._cache) {
      this._cache = Array.from(this._objects.values()).filter((object): object is T => this._match(object as T));
    }

    return this._cache;
  }

  subscribe(callback: (query: Query<T>) => void): Subscription {
    return this._updateEvent.on((updated) => {
      const changed = updated.some((object) => {
        if (this._objects.has(object.id)) {
          const match = this._match(this._objects.get(object.id)! as T);
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

  _match(object: T) {
    return this._filters.every((filter) => match(object, filter, this._options));
  }
}

// TODO(burdon): Create separate test.
const match = (object: EchoObject, filter: Filter<any>, options: QueryOptions = {}): object is TypedObject => {
  if (!isTypedObject(object)) {
    return false;
  }

  // TODO(burdon): Convert to filter.
  // if (object.__deleted) {
  //   if (options?.deleted === undefined || options?.deleted === ShowDeletedOption.HIDE_DELETED) {
  //     return false;
  //   }
  // } else {
  //   if (options?.deleted === ShowDeletedOption.SHOW_DELETED_ONLY) {
  //     return false;
  //   }
  // }

  if (typeof filter === 'function') {
    return filter(object);
  }

  if (typeof filter === 'object') {
    for (const key in filter) {
      const value = filter[key];
      if (key === '@type') {
        if (object.__typename !== value) {
          return false;
        }
      } else if ((object as any)[key] !== value) {
        return false;
      }
    }
  }

  return true;
};
