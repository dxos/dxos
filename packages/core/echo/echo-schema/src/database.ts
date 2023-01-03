//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';

import { Database, Item } from '@dxos/echo-db';
import { log } from '@dxos/log';
import { ObjectModel } from '@dxos/object-model';
import { TextModel } from '@dxos/text-model';

import { DatabaseRouter } from './database-router';
import { base, db, deleted, id } from './defs';
import { Document, DocumentBase } from './document';
import { EchoObject } from './object';
import { TextObject } from './text-object';

export type Filter = Record<string, any>;

// NOTE: `__phantom` property forces type.
export type TypeFilter<T extends Document> = { __phantom: T } & Filter;

export type SelectionFn = never; // TODO(burdon): Document or remove.
export type Selection = EchoObject | SelectionFn | Selection[];

export type Query<T extends Document = Document> = {
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

  constructor(
    /**
     * @internal
     */
    public readonly _db: Database,
    private readonly _router: DatabaseRouter
  ) {
    this._db.update.on(() => this._update());
    this._update();
  }

  get objects() {
    return Array.from(this._objects.values());
  }

  get router() {
    return this._router;
  }

  getObjectById(id: string) {
    return this._objects.get(id);
  }

  /**
   * Flush mutations.
   */
  // TODO(burdon): Batches?
  async save<T extends EchoObject>(obj: T): Promise<T> {
    assert(obj[id]); // TODO(burdon): Undefined when running in test.
    assert(obj[base]);
    if (obj[base]._isBound) {
      return obj;
    }

    assert(!obj[db]);
    obj[base]._isBound = true;
    this._objects.set(obj[base]._id, obj);

    const item = (await this._db.createItem({
      id: obj[base]._id,
      model: obj[base]._modelConstructor
    })) as Item<any>;

    obj[base]._bind(item, this);
    return obj;
  }

  /**
   * Toggle deleted flag.
   */
  async delete<T extends EchoObject>(obj: T): Promise<T> {
    console.log(1, obj[deleted], obj[base]._item);
    if (obj[deleted]) {
      await obj[base]._item!.restore();
    } else {
      console.log('del');
      await obj[base]._item!.delete();
    }
    console.log(2); // TODO(burdon): Not reached (wait for isn't reached).
    return obj;
  }

  /**
   * Filter by type.
   */
  // TODO(burdon): Additional filters?
  query<T extends Document>(filter: TypeFilter<T>): Query<T>;
  query(filter: Filter): Query;
  query(filter: Filter): Query {
    // TODO(burdon): Create separate test.
    const matchObject = (object: EchoObject): object is DocumentBase =>
      object instanceof DocumentBase && Object.entries(filter).every(([key, value]) => (object as any)[key] === value);

    // Current result.
    let cache: Document[] | undefined;

    return {
      getObjects: () => {
        if (!cache) {
          // TODO(burdon): Sort.
          cache = Array.from(this._objects.values()).filter(matchObject);
        }

        return cache;
      },

      subscribe: (callback: () => void) => {
        return this._db.update.on((updatedObjects) => {
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
   * @internal
   */
  _logObjectAccess(obj: EchoObject) {
    this._router._logObjectAccess(obj);
  }

  private _update() {
    for (const object of this._db.select({}).exec().entities) {
      if (!this._objects.has(object.id)) {
        const obj = this._createObjectInstance(object);
        if (!obj) {
          continue;
        }

        obj[base]._id = object.id;
        this._objects.set(object.id, obj);
        obj[base]._bind(object, this);
        obj[base]._isBound = true;
      }
    }
  }

  /**
   * Create object with a proper prototype representing the given item.
   */
  private _createObjectInstance(item: Item<any>): EchoObject | undefined {
    if (item.model instanceof ObjectModel) {
      return new Document(); // TODO(dmaretskyi): Schema types.
    } else if (item.model instanceof TextModel) {
      return new TextObject();
    } else {
      log.warn('Unknown model type', { model: item.model });
      return undefined;
    }
  }
}
