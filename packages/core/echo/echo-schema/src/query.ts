//
// Copyright 2022 DXOS.org
//

import { Event } from '@dxos/async';
import { Context } from '@dxos/context';
import { Item, type UpdateEvent } from '@dxos/echo-db';
import { invariant } from '@dxos/invariant';
import { type PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { type ComplexMap } from '@dxos/util';

import { base, type EchoObject } from './defs';
import { getDatabaseFromObject } from './echo-object-base';
import { ShowDeletedOption, type Filter } from './filter';
import { createSignal } from './signal';
import { isTypedObject, type TypedObject } from './typed-object';

// TODO(burdon): Test suite.
// TODO(burdon): Reconcile with echo-db/database/selection.

// TODO(burdon): Multi-sort option.
export type Sort<T extends TypedObject> = (a: T, b: T) => -1 | 0 | 1;

// TODO(burdon): Change to SubscriptionHandle.
export type Subscription = () => void;

export type QuerySourceUpdateEvent = {
  all: boolean;
  items?: Item[];
}

export interface QuerySource {
  update: Event<QuerySourceUpdateEvent>;
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
  private _cache: T[] | undefined = undefined;
  private _signal = createSignal?.();
  private _event = new Event<Query<T>>();

  constructor(
    private readonly _objectMaps: ComplexMap<PublicKey, Map<string, EchoObject>>,
    private readonly _updateEvent: Event<UpdateEvent>,
    filter: Filter,
  ) {
    this._filter = filter;

    // Weak listener to allow queries to be garbage collected.
    // TODO(dmaretskyi): Allow to specify a retainer.
    this._updateEvent.on(this._ctx, this._onUpdate, { weak: true });
  }

  get filter(): Filter {
    return this._filter;
  }

  get objects(): T[] {
    this._signal?.notifyRead();
    return this._getObjects();
  }

  // Hold a reference to the listener to prevent it from being garbage collected.
  private _onUpdate = (updateEvent: UpdateEvent) => {
    const objectMap = this._objectMaps.get(updateEvent.spaceKey);
    if(!objectMap) {
      return;
    }

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
    return filterMatch(this._filter, object);
  }
}

const filterMatch = (filter: Filter, object: EchoObject) => {
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

  if (filter.modelFilterPreference !== null) {
    if (!filter.modelFilterPreference.includes(object[base]._modelConstructor.meta.type)) {
      return false;
    }
  }

  if (filter.type) {
    if (!isTypedObject(object)) {
      return false;
    }

    const type = object[base]._getType();
    const host = type?.host ?? getDatabaseFromObject(object)?._backend.spaceKey.toHex();

    if (
      !type ||
      type.itemId !== filter.type.itemId ||
      type.protocol !== filter.type.protocol ||
      (host !== filter.type.host && type.host !== filter.type.host)
    ) {
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
