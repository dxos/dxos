//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';

import { Event } from '@dxos/async';
import { DocumentModel } from '@dxos/document-model';
import { DatabaseBackendProxy, Item, ItemManager } from '@dxos/echo-db';
import { log } from '@dxos/log';
import { EchoObject as EchoObjectProto } from '@dxos/protocols/proto/dxos/echo/object';
import { TextModel } from '@dxos/text-model';

import { DatabaseRouter } from './database-router';
import { base, db } from './defs';
import { Document, isDocument } from './document';
import { EchoObject } from './object';
import { Text } from './text-object';

export type PropertiesFilter = Record<string, any>;
export type OperatorFilter<T extends Document> = (document: T) => boolean;
export type Filter<T extends Document> = PropertiesFilter | OperatorFilter<T>;

// NOTE: `__phantom` property forces type.
export type TypeFilter<T extends Document> = { __phantom: T } & Filter<T>;

/**
 * Database wrapper.
 */
export class EchoDatabase {
  private readonly _objects = new Map<string, EchoObject>();

  /**
   * @internal
   */
  public readonly _updateEvent = new Event<Item[]>();

  constructor(
    /**
     * @internal
     */
    public readonly _itemManager: ItemManager,
    public readonly _backend: DatabaseBackendProxy,
    private readonly _router: DatabaseRouter
  ) {
    // TODO(dmaretskyi): Don't debounce?
    this._itemManager.update.on((item) => this._update([item]));
    this._update([]);
  }

  get objects() {
    return Array.from(this._objects.values());
  }

  get router() {
    return this._router;
  }

  // TODO(burdon): Return type via generic?
  getObjectById<T extends EchoObject>(id: string): T | undefined {
    const obj = this._objects.get(id);
    if (!obj) {
      return undefined;
    }
    if ((obj as any).__deleted === true) {
      return undefined;
    }

    return obj as T;
  }

  /**
   * Add object to th database.
   * Restores the object if it was deleted.
   */
  add<T extends EchoObject>(obj: T): T {
    log('save', { id: obj.id, type: (obj as any).__typename });
    assert(obj.id); // TODO(burdon): Undefined when running in test.
    assert(obj[base]);
    if (obj[base]._database) {
      this._backend.mutate({
        objects: [
          {
            objectId: obj[base]._id,
            mutations: [
              {
                action: EchoObjectProto.Mutation.Action.RESTORE
              }
            ]
          }
        ]
      });
      return obj;
    }

    assert(!obj[db]);
    obj[base]._database = this;
    this._objects.set(obj[base]._id, obj);

    const batchCreated = this._backend.beginBatch();
    try {
      obj[base]._beforeBind();

      const snapshot = obj[base]._createSnapshot();

      const result = this._backend.mutate({
        objects: [
          {
            objectId: obj[base]._id,
            genesis: {
              modelType: obj[base]._modelConstructor.meta.type
            },
            snapshot: {
              // TODO(dmaretskyi): Parent id, deleted flag.
              model: snapshot
            }
          }
        ]
      });
      assert(result.objectsCreated.length === 1);

      obj[base]._bind(result.objectsCreated[0]);
    } finally {
      if (batchCreated) {
        this._backend.commitBatch();
      }
    }

    return obj;
  }

  /**
   * Remove object.
   */
  remove<T extends Document>(obj: T) {
    this._backend.mutate({
      objects: [
        {
          objectId: obj[base]._id,
          mutations: [
            {
              action: EchoObjectProto.Mutation.Action.DELETE
            }
          ]
        }
      ]
    });
  }

  /**
   * Wait for all pending operations to complete.
   */
  async flush() {
    await this._backend.flush();
  }

  /**
   * Filter by type.
   */
  // TODO(burdon): Additional filters?
  query<T extends Document>(filter: TypeFilter<T>): Query<T>;
  query(filter?: Filter<any>): Query;
  query(filter: Filter<any>): Query {
    return new Query(this._objects, this._updateEvent, filter);
  }

  /**
   * @internal
   */
  _logObjectAccess(obj: EchoObject) {
    this._router._logObjectAccess(obj);
  }

  private _update(changed: Item[]) {
    for (const object of this._itemManager.entities.values() as any as Item<any>[]) {
      if (!this._objects.has(object.id)) {
        const obj = this._createObjectInstance(object);
        if (!obj) {
          continue;
        }

        obj[base]._id = object.id;
        this._objects.set(object.id, obj);
        obj[base]._database = this;
        obj[base]._bind(object);
      }
    }

    this._updateEvent.emit(changed);
  }

  /**
   * Create object with a proper prototype representing the given item.
   */
  private _createObjectInstance(item: Item<any>): EchoObject | undefined {
    if (item.modelType === DocumentModel.meta.type) {
      const type = item.state['@type'];
      if (!type) {
        return new Document();
      }

      const Proto = this._router.schema?.getPrototype(type);
      if (!Proto) {
        log.warn('Unknown schema type', { type });
        return new Document();
      } else {
        return new Proto();
      }
    } else if (item.modelType === TextModel.meta.type) {
      return new Text();
    } else {
      log.warn('Unknown model type', { type: item.modelType });
      return undefined;
    }
  }
}

export type Subscription = () => void;

export class Query<T extends Document = Document> {
  constructor(
    private readonly _dbObjects: Map<string, EchoObject>,
    private readonly _updateEvent: Event<Item[]>,
    private readonly _filter: Filter<any>
  ) { }

  private _cache: T[] | undefined;

  get objects(): T[] {
    if (!this._cache) {
      // TODO(burdon): Sort.
      this._cache = Array.from(this._dbObjects.values()).filter((obj): obj is T => filterMatcher(this._filter, obj));
    }

    return this._cache;
  }

  subscribe(callback: (query: Query<T>) => void): Subscription {
    return this._updateEvent.on((updated) => {
      const changed = updated.some((object) => {
        if (this._dbObjects.has(object.id)) {
          const match = filterMatcher(this._filter, this._dbObjects.get(object.id)!);
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
const filterMatcher = (filter: Filter<any>, object: EchoObject): object is Document => {
  if (!isDocument(object)) {
    return false;
  }
  if (object.__deleted) {
    return false;
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
