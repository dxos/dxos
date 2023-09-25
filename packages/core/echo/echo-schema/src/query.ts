//
// Copyright 2022 DXOS.org
//

import { Event } from '@dxos/async';
import { Item, QueryOptions, ShowDeletedOption } from '@dxos/echo-db';

import { EchoObject } from './object';
import { isTypedObject, TypedObject } from './typed-object';
import { createSignal } from './signal';

// TODO(burdon): Test suite.
// TODO(burdon): Reconcile with echo-db/database/selection.

// TODO(burdon): Multi-sort option.
export type Sort<T extends TypedObject> = (a: T, b: T) => -1 | 0 | 1;

// TODO(burdon): Operators (EQ, NE, GT, LT, IN, etc.)
export type PropertyFilter = Record<string, any>;

export type OperatorFilter<T extends TypedObject> = (object: T) => boolean;

export type Filter<T extends TypedObject> = PropertyFilter | OperatorFilter<T>;

// NOTE: `__phantom` property forces TS type check.
export type TypeFilter<T extends TypedObject> = { __phantom: T } & Filter<T>;

export type Subscription = () => void;

/**
 * Predicate based query.
 */
export class Query<T extends TypedObject = TypedObject> {
  private readonly _filters: Filter<any>[] = [];
  private _cache: T[] | undefined = undefined;
  private _signal = createSignal?.();

  constructor(
    private readonly _objects: Map<string, EchoObject>,
    private readonly _updateEvent: Event<Item[]>,
    filter: Filter<any> | Filter<any>[],
    options?: QueryOptions,
  ) {
    this._filters.push(filterDeleted(options?.deleted));
    this._filters.push(...(Array.isArray(filter) ? filter : [filter]));

    // TODO(dmaretskyi): Needs to be weak.
    this._updateEvent.on(() => {
      this._cache = undefined;
      this._signal?.notifyWrite()
    });
  }

  get objects(): T[] {
    this._signal?.notifyRead();

    if (!this._cache) {
      this._cache = Array.from(this._objects.values()).filter((object): object is T => this._match(object as T));
    }

    return this._cache;
  }

  // TODO(burdon): Option to trigger immediately.
  subscribe(callback: (query: Query<T>) => void): Subscription {
    return this._updateEvent.on((updated) => {
      const changed = updated.some((object) => {
        const exists = this._cache?.find((obj) => obj.id === object.id);
        if (this._objects.has(object.id) || exists) {
          const match = this._match(this._objects.get(object.id)! as T);
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
    return isTypedObject(object) && this._filters.every((filter) => match(object, filter));
  }
}

const filterDeleted = (option?: ShowDeletedOption) => (object: TypedObject) => {
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

const match = (object: TypedObject, filter: Filter<any>): object is TypedObject => {
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
