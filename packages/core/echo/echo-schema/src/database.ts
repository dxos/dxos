//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';

import { Any } from '@dxos/codec-protobuf';
import { DocumentModel } from '@dxos/document-model';
import { DatabaseBackendProxy, Item, ItemManager, encodeModelMutation } from '@dxos/echo-db';
import { log } from '@dxos/log';
import { TextModel } from '@dxos/text-model';

import { DatabaseRouter } from './database-router';
import { base, db, deleted, id, type } from './defs';
import { DELETED, Document, DocumentBase, isDocument } from './document';
import { EchoObject } from './object';
import { TextObject } from './text-object';

export type PropertiesFilter = Record<string, any>;
export type OperatorFilter<T extends DocumentBase> = (document: T) => boolean;
export type Filter<T extends DocumentBase> = PropertiesFilter | OperatorFilter<T>;

// NOTE: `__phantom` property forces type.
export type TypeFilter<T extends Document> = { __phantom: T } & Filter<T>;

export type SelectionFn = never; // TODO(burdon): Document or remove.
export type Selection = EchoObject | SelectionFn | Selection[];

export type Subscription = () => void;

export type Query<T extends Document = Document> = {
  getObjects(): T[];
  subscribe(callback: (query: Query<T>) => void): Subscription;
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
    public readonly _itemManager: ItemManager,
    public readonly _backend: DatabaseBackendProxy,
    private readonly _router: DatabaseRouter
  ) {
    // TODO(dmaretskyi): Don't debounce?
    this._itemManager.debouncedUpdate.on(() => this._update());
    this._update();
  }

  get objects() {
    return Array.from(this._objects.values());
  }

  get router() {
    return this._router;
  }

  // TODO(burdon): Return type via generic?
  getObjectById(id: string) {
    const obj = this._objects.get(id);
    if (!obj) {
      return undefined;
    }
    if ((obj as any)[deleted] === true) {
      return undefined;
    }

    return obj;
  }

  /**
   * Flush mutations.
   */
  // TODO(burdon): Batches?
  async save<T extends EchoObject>(obj: T): Promise<T> {
    log('save', { id: obj[id], type: (obj as any)[type] });
    assert(obj[id]); // TODO(burdon): Undefined when running in test.
    assert(obj[base]);
    if (obj[base]._database) {
      return obj;
    }

    assert(!obj[db]);
    obj[base]._database = this;
    this._objects.set(obj[base]._id, obj);

    let mutation: Any | undefined;
    if (obj instanceof DocumentBase) {
      const props = {
        type: obj[type]
      };
      const modelMeta = obj[base]._modelConstructor.meta;
      mutation = encodeModelMutation(modelMeta, modelMeta.getInitMutation!(props));
    }

    const result = this._backend.mutate({
      objects: [
        {
          objectId: obj[base]._id,
          genesis: {
            modelType: obj[base]._modelConstructor.meta.type
          },
          mutations: !mutation
            ? []
            : [
                {
                  model: mutation
                }
              ]
        }
      ]
    });
    assert(result.objectsCreated.length === 1);

    await obj[base]._bind(result.objectsCreated[0]);
    await result.getReceipt(); // wait to be saved to feed.
    return obj;
  }

  /**
   * Toggle deleted flag.
   */
  // TODO(burdon): Delete/restore.
  async delete<T extends DocumentBase>(obj: T): Promise<T> {
    if (obj[deleted]) {
      (obj as any)[DELETED] = false;
    } else {
      (obj as any)[DELETED] = true;
    }
    return obj;
  }

  /**
   * Filter by type.
   */
  // TODO(burdon): Additional filters?
  query<T extends Document>(filter: TypeFilter<T>): Query<T>;
  query(filter?: Filter<any>): Query;
  query(filter: Filter<any>): Query {
    // TODO(burdon): Create separate test.
    // TODO(dmaretskyi): Extract.
    const matcher = (object: EchoObject): object is DocumentBase =>
      isDocument(object) &&
      !object[deleted] &&
      (typeof filter !== 'object' || filter['@type'] || object[type] === filter['@type']) &&
      (!filter ||
        Object.entries(filter)
          .filter(([key]) => key !== '@type')
          .every(([key, value]) => (object as any)[key] === value));

    // Current result.
    let cache: Document[] | undefined;

    const query = {
      getObjects: () => {
        if (!cache) {
          // TODO(burdon): Sort.
          cache = Array.from(this._objects.values()).filter(matcher);
        }

        return cache;
      },

      // TODO(burdon): Trigger callback on call (not just update).
      subscribe: (callback: (query: Query) => void) => {
        // TODO(dmaretskyi): Don't debounce?
        return this._backend._itemManager.debouncedUpdate.on((updatedObjects) => {
          const changed = updatedObjects.some((object) => {
            if (this._objects.has(object.id)) {
              const match = matcher(this._objects.get(object.id)!);
              const exists = cache?.find((obj) => obj[id] === object.id);
              return match || (exists && !match);
            } else {
              return false;
            }
          });

          if (changed) {
            cache = undefined;
            callback(query);
          }
        });
      }
    };

    return query;
  }

  /**
   * @internal
   */
  _logObjectAccess(obj: EchoObject) {
    this._router._logObjectAccess(obj);
  }

  private _update() {
    for (const object of this._itemManager.entities.values() as any as Item<any>[]) {
      if (!this._objects.has(object.id)) {
        const obj = this._createObjectInstance(object);
        if (!obj) {
          continue;
        }

        obj[base]._id = object.id;
        this._objects.set(object.id, obj);
        obj[base]._database = this;
        obj[base]._bind(object).catch((err) => log.catch(err));
      }
    }
  }

  /**
   * Create object with a proper prototype representing the given item.
   */
  private _createObjectInstance(item: Item<any>): EchoObject | undefined {
    if (item.modelMeta.type === DocumentModel.meta.type) {
      const type = item._stateManager.state['@type'];
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
    } else if (item.modelMeta.type === TextModel.meta.type) {
      return new TextObject();
    } else {
      log.warn('Unknown model type', { type: item.modelMeta.type });
      return undefined;
    }
  }
}
