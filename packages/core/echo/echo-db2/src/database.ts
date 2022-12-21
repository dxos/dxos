//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';

import { Database, Item } from '@dxos/echo-db';
import { ObjectModel } from '@dxos/object-model';

import { unproxy } from './common';
import { EchoObject, EchoObjectBase } from './object';
import { TypeFilter } from './schema';
import { traverse } from './traverse';

export type Filter = Record<string, any>;
export type Query<T extends EchoObject = EchoObject> = {
  getObjects(): T[];
  subscribe(callback: () => void): () => void;
};

export type SelectionFn = never; // TODO(dmaretskyi): ?
export type Selection = EchoObject | SelectionFn | Selection[];
// export type Predicate = { [key: string]: any };
// export type Anchor = EchoDatabase | EchoObject | EchoObject[] | undefined;
// export type Selector = Predicate;

/**
 *
 */
export interface SelectionHandle {
  update: (selection: Selection) => void;
  subscribed: boolean;
  unsubscribe: () => void;
  selectedIds: Set<string>
}

/**
 *
 */
export class EchoDatabase {
  private readonly _objects = new Map<string, EchoObject>();

  constructor(private readonly _echo: Database) {
    this._echo.update.on(() => {
      for (const object of this._echo.select({}).exec().entities) {
        if (!this._objects.has(object.id)) {
          const obj = new EchoObject();
          obj[unproxy]._id = object.id;
          this._objects.set(object.id, obj);
          obj[unproxy]._bind(object, this);
          obj[unproxy]._isBound = true;
        }
      }
    });
  }

  get objects() {
    return Array.from(this._objects.values());
  }

  getObjectById(id: string) {
    // TODO(burdon): Type?
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
    assert(item.id === obj[unproxy]._id);
    obj[unproxy]._bind(item, this);
    return obj;
  }

  /**
   *
   */
  query<T extends EchoObject>(filter: TypeFilter<T>): Query<T>;
  query(filter: Filter): Query;
  query(filter: Filter): Query {
    // TODO(burdon): Test separately.
    const match = (obj: EchoObject) => Object.entries(filter).every(([key, value]) => obj[key] === value);

    let cache: EchoObject[] | undefined;

    // TODO(burdon): Replace with getter.
    return {
      getObjects: () => {
        if (!cache) {
          cache = Array.from(this.objects.values()).filter((obj) => match(obj));
        }
        return cache;
      },

      subscribe: (callback: () => void) => {
        return this._echo.update.on((changedEntities) => {
          if (changedEntities.some((entity) => this._objects.has(entity.id) && match(this._objects.get(entity.id)!))) {
            cache = undefined;
            callback();
          }
        });
      }
    };
  }

  /**
   *
   */
  createSubscription(onUpdate: () => void): SelectionHandle {
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

  /**
   * @deprecated
   */
  // TODO(burdon): Remove.
  subscribe(traverseCb: (touch: (obj: EchoObject) => any) => void, callback: () => void): () => void {
    const touched = new Set<string>();
    const retouch = () => {
      touched.clear();
      traverse(traverseCb, (obj) => {
        touched.add(obj[unproxy]._id);
      });
    };

    retouch();
    return this._echo.update.on((changedEntities) => {
      if (changedEntities.some((entity) => touched.has(entity.id))) {
        retouch();
        callback();
      }
    });
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
