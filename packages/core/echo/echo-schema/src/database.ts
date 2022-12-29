//
// Copyright 2022 DXOS.org
//

import { Database, Item } from '@dxos/echo-db';
import { ObjectModel } from '@dxos/object-model';

import { id, unproxy } from './defs';
import { EchoObject, EchoObjectBase } from './object';

export type Filter = Record<string, any>;

// NOTE: `__phantom` property forces type.
export type TypeFilter<T extends EchoObject> = { __phantom: T } & Filter;

export type SelectionFn = never; // TODO(burdon): Document or remove.
export type Selection = EchoObject | SelectionFn | Selection[];

export type Query<T extends EchoObject = EchoObject> = {
  getObjects(): T[];
  subscribe(callback: () => void): () => void;
};

export interface SubscriptionHandle {
  update: (selection: Selection) => void;
  subscribed: boolean;
  unsubscribe: () => void;
  selectedIds: Set<string>;
}

/**
 * Database wrapper.
 */
export class EchoDatabase {
  private readonly _objects = new Map<string, EchoObject>();

  private readonly _accessObserverStack: AccessObserver[] = [];

  constructor(private readonly _echo: Database) {
    this._echo.update.on(() => this._update());
    this._update();
  }

  get objects() {
    return Array.from(this._objects.values());
  }

  getObjectById(id: string) {
    return this._objects.get(id);
  }

  /**
   * Flush mutations.
   */
  // TODO(burdon): Batches?
  async save<T extends EchoObjectBase>(obj: T): Promise<T> {
    if (obj[unproxy]._isBound) {
      return obj;
    }

    obj[unproxy]._isBound = true;
    this._objects.set(obj[unproxy]._id, obj);

    const item = (await this._echo.createItem({ id: obj[unproxy]._id })) as Item<ObjectModel>;
    obj[unproxy]._bind(item, this);
    return obj;
  }

  /**
   * Filter by type.
   */
  // TODO(burdon): Additional filters?
  query<T extends EchoObject>(filter: TypeFilter<T>): Query<T>;
  query(filter: Filter): Query;
  query(filter: Filter): Query {
    // TODO(burdon): Create separate test.
    const matchObject = (object: EchoObject) => Object.entries(filter).every(([key, value]) => object[key] === value);

    // Current result.
    let cache: EchoObject[] | undefined;

    return {
      getObjects: () => {
        if (!cache) {
          // TODO(burdon): Sort.
          cache = Array.from(this._objects.values()).filter((obj) => matchObject(obj));
        }

        return cache;
      },

      subscribe: (callback: () => void) => {
        return this._echo.update.on((updatedObjects) => {
          const changed = updatedObjects.some((object) => {
            if (this._objects.has(object.id)) {
              const match = matchObject(this._objects.get(object.id)!);
              const exists = cache?.find((obj) => obj[id] === object.id);
              return (exists && !match) || (!exists && match);
            } else {
              return false;
            }
          });

          if (changed) {
            cache = undefined;
            callback();
          }
        });
      }
    };
  }

  /**
   * Subscribe to database updates.
   */
  // TODO(burdon): Add filter?
  createSubscription(onUpdate: () => void): SubscriptionHandle {
    let subscribed = true;

    const unsubscribe = this._echo.update.on((changedEntities) => {
      subscribed = false;
      if (changedEntities.some((entity) => handle.selectedIds.has(entity.id))) {
        onUpdate();
      }
    });

    const handle = {
      update: (selection: Selection) => {
        handle.selectedIds = new Set(getIdsFromSelection(selection));
        return handle;
      },
      subscribed,
      selectedIds: new Set<string>(),
      unsubscribe
    };

    return handle;
  }

  createAccessObserver(): AccessObserver {
    const observer = new AccessObserver(() => {
      this._accessObserverStack.splice(this._accessObserverStack.indexOf(observer), 1);
    });
    this._accessObserverStack.push(observer);
    return observer;
  }

  /**
   * @internal
   */
  _logObjectAccess(obj: EchoObject) {
    this._accessObserverStack.at(-1)?.accessed.add(obj);
  }
  
  private _update() {
    for (const object of this._echo.select({}).exec().entities) {
      if (!this._objects.has(object.id)) {
        const obj = new EchoObject();
        obj[unproxy]._id = object.id;
        this._objects.set(object.id, obj);
        obj[unproxy]._bind(object, this);
        obj[unproxy]._isBound = true;
      }
    }
  }
}

// TODO(burdon): Document.
const getIdsFromSelection = (selection: Selection): string[] => {
  if (selection instanceof EchoObjectBase) {
    return [selection[unproxy]._id];
  } else if (typeof selection === 'function') {
    return []; // TODO(burdon): Traverse function?
  } else if (!selection) {
    return [];
  } else {
    return selection.flatMap(getIdsFromSelection);
  }
};

/**
 * Observes object access.
 */
export class AccessObserver {
  accessed: Set<EchoObjectBase> = new Set();

  constructor(
    public pop: () => void
  ) {}
}