//
// Copyright 2020 DXOS.org
//

import { Event, EventSubscriptions } from '@dxos/async';
import { FeedWriter } from '@dxos/feed-store';
import { log } from '@dxos/log';
import { Model, ModelMeta, StateManager } from '@dxos/model-factory';
import { ItemID, ItemType } from '@dxos/protocols';
import { DataMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { EchoObject } from '@dxos/protocols/proto/dxos/echo/object';

import { ItemManager } from './item-manager';

/**
 * A globally addressable data item.
 * Items are hermetic data structures contained within a Space. They may be hierarchical.
 * The Item data structure is governed by a Model class, which implements data consistency.
 */
export class Item<M extends Model | null = Model> {
  /**
   * Parent item (or null if this item is a root item).
   */
  private _parent: Item<any> | null = null;

  /**
   * Denotes soft delete.
   * Item can be restored until garbage collection (e.g., via snapshots).
   */
  private _deleted = false;

  /**
   * Managed set of child items.
   * @internal
   */
  readonly _children = new Set<Item<any>>();

  // Called whenever item processes mutation.
  protected readonly _onUpdate = new Event<Item<any>>();

  private readonly _subscriptions = new EventSubscriptions();

  public _stateManager!: StateManager<NonNullable<M>>;

  /**
   * Items are constructed by the `Database` object.
   * @param itemManager
   * @param objectId        Addressable ID.
   * @param itemType      User defined type (DXN).
   * @param stateManager  Data model (provided by `ModelFactory`).
   * @param _writeStream  Write stream (if not read-only).
   * @param parent        Parent Item (if not a root Item).
   */
  constructor(
    protected readonly _itemManager: ItemManager,
    private readonly _id: ItemID,
    private readonly _type: ItemType | undefined,
    stateManager: StateManager<NonNullable<M>>,
    private readonly _writeStream?: FeedWriter<DataMessage>,
    parent?: Item<any> | null
  ) {
    this._stateManager = stateManager;

    if (this._stateManager.initialized) {
      this._subscriptions.add(this._stateManager.update.on(() => this._onUpdate.emit(this)));
    }
    this._updateParent(parent);
  }

  get id(): ItemID {
    return this._id;
  }

  get type(): ItemType | undefined {
    return this._type;
  }

  get modelType(): string {
    return this._stateManager.modelType;
  }

  get modelMeta(): ModelMeta {
    return this._stateManager.modelMeta;
  }

  /**
   * Subscribe for updates.
   * @param listener
   */
  subscribe(listener: (entity: this) => void) {
    return this._onUpdate.on(listener as any);
  }

  /**
   * @internal
   * Waits for pending operations to complete.
   */
  async _destroy() {
    await this._stateManager.destroy();
  }

  toString() {
    return `Item(${JSON.stringify({
      objectId: this.id,
      parentId: this.parent?.id,
      itemType: this.type
    })})`;
  }

  get readOnly() {
    return !this._writeStream || this._deleted;
  }

  get deleted() {
    return this._deleted;
  }

  get parent(): Item<any> | null {
    return this._parent;
  }

  get children(): Item<any>[] {
    return Array.from(this._children.values()).filter((item) => !item.deleted);
  }

  /**
   * Delete the item.
   */
  // TODO(burdon): Referential integrity (e.g., delete/hide children?)
  // TODO(burdon): Queries should skip deleted items (unless requested).
  // TODO(burdon): Garbage collection (snapshots should drop deleted items).
  // TODO(burdon): Prevent updates to model if deleted.
  // TODO(burdon): If deconstructed (itemManager.deconstructItem) then how to query?
  async delete() {
    if (!this._writeStream) {
      throw new Error(`Item is read-only: ${this.id}`);
    }
    if (this.deleted) {
      return;
    }

    const onUpdate = this._onUpdate.waitFor(() => this.deleted);
    await this._writeStream.write({
      object: {
        objectId: this.id,
        mutations: [
          {
            action: EchoObject.Mutation.Action.DELETE
          }
        ]
      }
    });

    await onUpdate;
  }

  /**
   * Restore deleted item.
   */
  async restore() {
    if (!this._writeStream) {
      throw new Error(`Item is read-only: ${this.id}`);
    }

    const onUpdate = this._onUpdate.waitFor(() => !this.deleted);
    await this._writeStream.write({
      object: {
        objectId: this.id,
        mutations: [
          {
            action: EchoObject.Mutation.Action.RESTORE
          }
        ]
      }
    });

    await onUpdate;
  }

  // TODO(telackey): This does not allow null or undefined as a parent_id, but should it since we allow a null parent?
  async setParent(parentId: ItemID): Promise<void> {
    if (!this._writeStream || this.readOnly) {
      throw new Error(`Item is read-only: ${this.id}`);
    }

    // Wait for mutation below to be processed.
    // TODO(burdon): Refine to wait for this specific mutation.
    const onUpdate = this._onUpdate.waitFor(() => parentId === this._parent?.id);

    await this._writeStream.write({
      object: {
        objectId: this.id,
        mutations: [
          {
            parentId
          }
        ]
      }
    });

    await onUpdate;
  }

  /**
   * Process a mutation from the stream.
   * @private (Package-private).
   */
  _processMutation(mutation: EchoObject.Mutation, getItem: (objectId: ItemID) => Item<any> | undefined) {
    log('_processMutation %s', { mutation });

    const { action, parentId } = mutation;

    switch (action) {
      case EchoObject.Mutation.Action.DELETE: {
        this._deleted = true;
        break;
      }

      case EchoObject.Mutation.Action.RESTORE: {
        this._deleted = false;
        break;
      }
    }

    // TODO(burdon): Convert to Action.
    if (parentId) {
      const parent = getItem(parentId);
      this._updateParent(parent);
    }

    this._onUpdate.emit(this);
  }

  /**
   * Atomically update parent/child relationship.
   * @param parent
   */
  private _updateParent(parent: Item<any> | null | undefined) {
    log('_updateParent', { parent: parent?.id, prevParent: this._parent?.id });
    if (this._parent) {
      this._parent._children.delete(this);
    }

    if (parent) {
      this._parent = parent;
      this._parent._children.add(this);
    } else {
      this._parent = null;
    }
  }
}
