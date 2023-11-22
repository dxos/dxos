//
// Copyright 2022 DXOS.org
//

import { Event, type ReadOnlyEvent } from '@dxos/async';
import { DocumentModel, type Reference, type DocumentModelState } from '@dxos/document-model';
import { type BatchUpdate, type DatabaseProxy, type Item, type ItemManager, UpdateEvent } from '@dxos/echo-db';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { type QueryOptions } from '@dxos/protocols/proto/dxos/echo/filter';
import { EchoObject as EchoObjectProto } from '@dxos/protocols/proto/dxos/echo/object';
import { TextModel } from '@dxos/text-model';
import { WeakDictionary, getDebugName } from '@dxos/util';

import { AutomergeDb } from './automerge/automerge-db';
import { AutomergeObject } from './automerge/automerge-object';
import { type Hypergraph } from './hypergraph';
import { type EchoObject, base, db, TextObject } from './object';
import { TypedObject } from './object';
import { type Schema } from './proto';
import { type FilterSource, type Query } from './query';

/**
 * Database wrapper.
 */
export class EchoDatabase {
  /**
   * @internal
   */
  readonly _objects = new Map<string, EchoObject>();

  /**
   * Objects that have been removed from the database.
   */
  private readonly _removed = new WeakDictionary<string, EchoObject>();

  /**
   * @internal
   */
  readonly _updateEvent = new Event<UpdateEvent>();

  public readonly pendingBatch: ReadOnlyEvent<BatchUpdate> = this._backend.pendingBatch;

  public readonly automerge = new AutomergeDb(this._graph);

  constructor(
    /**
     * @internal
     */
    readonly _itemManager: ItemManager,
    public readonly _backend: DatabaseProxy,
    private readonly _graph: Hypergraph,
  ) {
    this._backend.itemUpdate.on(this._update.bind(this));

    // Load all existing objects.
    this._update(new UpdateEvent(this._backend.spaceKey)); // TODO: Seems hacky.
  }

  get objects(): EchoObject[] {
    return Array.from(this._objects.values());
  }

  get graph() {
    return this._graph;
  }

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
   * Add object to the database.
   * Restores the object if it was deleted.
   */
  add<T extends EchoObject>(obj: T): T {
    if (obj[base] instanceof AutomergeObject) {
      return this.automerge.add(obj);
    }

    log('add', { id: obj.id, type: (obj as any).__typename });
    invariant(obj.id); // TODO(burdon): Undefined when running in test.
    invariant(obj[base]);

    if (this._removed.has(obj[base]._id)) {
      this._backend.mutate({
        objects: [
          {
            objectId: obj[base]._id,
            mutations: [
              {
                action: EchoObjectProto.Mutation.Action.RESTORE,
              },
            ],
          },
        ],
      });
      this._removed.delete(obj[base]._id);
      return obj;
    }

    if (obj[base]._database) {
      return obj;
    }

    invariant(!obj[db]);
    obj[base]._database = this;

    const batchCreated = this._backend.beginBatch();
    try {
      obj[base]._beforeBind();

      const snapshot = obj[base]._createSnapshot();

      log('add to set', { id: obj[base]._id, instance: getDebugName(obj) });
      invariant(!this._objects.has(obj[base]._id));
      this._objects.set(obj[base]._id, obj);

      const result = this._backend.mutate({
        objects: [
          {
            objectId: obj[base]._id,
            genesis: {
              modelType: obj[base]._modelConstructor.meta.type,
            },
            snapshot: {
              // TODO(dmaretskyi): Parent id, deleted flag.
              model: snapshot,
            },
          },
        ],
      });
      invariant(result.updateEvent.itemsUpdated.length === 1);

      obj[base]._bind(result.updateEvent.itemsUpdated[0]);
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
  remove<T extends EchoObject>(obj: T) {
    if (obj[base] instanceof AutomergeObject) {
      return this.automerge.remove(obj);
    }

    log('remove', { id: obj.id, type: (obj as any).__typename });

    this._backend.mutate({
      objects: [
        {
          objectId: obj[base]._id,
          mutations: [
            {
              action: EchoObjectProto.Mutation.Action.DELETE,
            },
          ],
        },
      ],
    });

    this._removed.set(obj[base]._id, obj);
  }

  /**
   * Clone object from other database.
   * @deprecated
   */
  clone<T extends EchoObject>(obj: T) {
    log('clone', { id: obj.id, type: (obj as any).__typename });
    console.warn('deprecated'); // TODO(burdon): ???

    // TODO(burdon): Keep id.
    this.add(obj);
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
  query<T extends TypedObject>(filter?: FilterSource<T>, options?: QueryOptions): Query<T> {
    options ??= {};
    options.spaces = [this._backend.spaceKey];

    return this._graph.query(filter, options);
  }

  private _update(updateEvent: UpdateEvent) {
    // TODO(dmaretskyi): Optimize to not iterate the entire item set.
    for (const object of this._itemManager.entities.values() as any as Item<any>[]) {
      if (!this._objects.has(object.id)) {
        let obj = this._removed.get(object.id);
        this._removed.delete(object.id);
        if (!obj) {
          obj = this._createObjectInstance(object);
        }
        if (!obj) {
          continue;
        }

        obj[base]._id = object.id;
        log('add to set', { id: obj[base]._id, instance: getDebugName(obj) });
        invariant(!this._objects.has(object.id));
        this._objects.set(object.id, obj);
        obj[base]._database = this;
        obj[base]._beforeBind();
        obj[base]._bind(object);
      }
    }

    // Remove objects that are no longer in the database.
    for (const [id, obj] of this._objects.entries()) {
      if (!this._itemManager.entities.has(id)) {
        if (obj[base]._item) {
          obj[base]._item.deleted = true;
        }
        obj[base]._itemUpdate();
        this._objects.delete(id);
        obj[base]._database = undefined;
        this._removed.set(obj[base]._id, obj);
      }
    }

    // Dispatch update events.
    for (const item of updateEvent.itemsUpdated) {
      const obj = this._objects.get(item.id);
      if (obj) {
        obj[base]._itemUpdate();
      }
    }

    this._updateEvent.emit(updateEvent);
  }

  /**
   * Create object with a proper prototype representing the given item.
   */
  private _createObjectInstance(item: Item<any>): EchoObject | undefined {
    if (item.modelType === DocumentModel.meta.type) {
      const state = item.state as DocumentModelState;
      if (!state.type) {
        return new TypedObject();
      } else {
        return new TypedObject(undefined, { type: state.type });
      }
    } else if (item.modelType === TextModel.meta.type) {
      return new TextObject();
    } else {
      log.warn('Unknown model type', { type: item.modelType });
      return undefined;
    }
  }

  /**
   * @internal
   */
  _resolveSchema(type: Reference): Schema | undefined {
    if (type.protocol === 'protobuf') {
      return this._graph.types.getSchema(type.itemId);
    } else {
      // TODO(dmaretskyi): Cross-space references.
      return this.getObjectById(type.itemId) as Schema | undefined;
    }
  }
}
