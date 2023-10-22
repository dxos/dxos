//
// Copyright 2022 DXOS.org
//

import { Event } from '@dxos/async';
import { Context } from '@dxos/context';
import { type QueryOptions, ShowDeletedOption, type UpdateEvent } from '@dxos/echo-db';
import { invariant } from '@dxos/invariant';
import { type PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { type ComplexMap } from '@dxos/util';

import { type EchoObject } from './defs';
import { createSignal } from './signal';
import { isTypedObject, type TypedObject } from './typed-object';

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

// TODO(burdon): Change to SubscriptionHandle.
export type Subscription = () => void;

/**
 * Predicate based query.
 */
export class Query<T extends TypedObject = TypedObject> {
  private readonly _ctx = new Context({
    onError: (err) => {
      log.catch(err);
    },
  });

  private readonly _filters: Filter<any>[] = [];
  private _cache: T[] | undefined = undefined;
  private _signal = createSignal?.();
  private _event = new Event<Query<T>>();

  constructor(
    private readonly _objectMaps: ComplexMap<PublicKey, Map<string, EchoObject>>,
    private readonly _updateEvent: Event<UpdateEvent>,
    filter: Filter<any> | Filter<any>[],
    options?: QueryOptions,
  ) {
    this._filters.push(filterDeleted(options?.deleted));
    this._filters.push(...(Array.isArray(filter) ? filter : [filter]));

    // Weak listener to allow queries to be garbage collected.
    // TODO(dmaretskyi): Allow to specify a retainer.
    this._updateEvent.on(this._ctx, this._onUpdate, { weak: true });
  }

  get objects(): T[] {
    this._signal?.notifyRead();
    return this._getObjects();
  }

  // Hold a reference to the listener to prevent it from being garbage collected.
  private _onUpdate = (updateEvent: UpdateEvent) => {
    const objectMap = this._objectMaps.get(updateEvent.spaceKey);
    invariant(objectMap, 'Invalid update routed.');

    // TODO(dmaretskyi): Could be optimized to recompute changed only to the relevant space.
    const changed = updateEvent.itemsUpdated.some((object) => {
      return (
        !this._cache ||
        this._cache.find((obj) => obj.id === object.id) ||
        (objectMap.has(object.id) && this._match(objectMap.get(object.id)! as T))
      );
    });

    if (changed) {
      this._cache = undefined;
      this._signal?.notifyWrite();
      this._event.emit(this);
    }
  };

  private _getObjects() {
    if (!this._cache) {
      this._cache = Array.from(this._objectMaps.values()).flatMap((objects) =>
        Array.from(objects.values()).filter((object): object is T => this._match(object as T)),
      );
    }

    return this._cache;
  }

  // TODO(burdon): Change to SubscriptionHandle.
  subscribe(callback: (query: Query<T>) => void, fire = false): Subscription {
    const subscription = this._event.on(callback);
    if (fire) {
      callback(this);
    }

    return subscription;
  }

  private _match(object: T) {
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
