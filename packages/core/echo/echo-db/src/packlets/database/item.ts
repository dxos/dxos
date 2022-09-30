//
// Copyright 2020 DXOS.org
//

import debug from 'debug';

import { FeedWriter } from '@dxos/feed-store';
import { Model, StateManager } from '@dxos/model-factory';
import { ItemID, ItemType } from '@dxos/protocols';
import { EchoEnvelope, ItemMutation } from '@dxos/protocols/proto/dxos/echo/feed';

import { Entity } from './entity';
import { ItemManager } from './item-manager';
import type { Link } from './link';
import { createItemSelection, Selection } from './selection';

const log = debug('dxos:echo-db:item');

/**
 * A globally addressable data item.
 * Items are hermetic data structures contained within a Party. They may be hierarchical.
 * The Item data structure is governed by a Model class, which implements data consistency.
 */
export class Item<M extends Model | null = Model> extends Entity<M> {
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

  /**
   * Managed set of links with this item as the source.
   * @internal
   */
  readonly _links = new Set<Link<any, any, any>>();

  /**
   * Managed set of links with this item as the target.
   * @internal
   */
  readonly _refs = new Set<Link<any, any, any>>();

  /**
   * Items are constructed by the `Database` object.
   * @param itemManager
   * @param itemId        Addressable ID.
   * @param itemType      User defined type (DXN).
   * @param stateManager  Data model (provided by `ModelFactory`).
   * @param _writeStream  Write stream (if not read-only).
   * @param parent        Parent Item (if not a root Item).
   */
  constructor (
    itemManager: ItemManager,
    itemId: ItemID,
    itemType: ItemType | undefined, // TODO(burdon): Why allow undefined?
    stateManager: StateManager<NonNullable<M>>,
    private readonly _writeStream?: FeedWriter<EchoEnvelope>,
    parent?: Item<any> | null
  ) {
    super(itemManager, itemId, itemType, stateManager);
    this._updateParent(parent);
  }

  override toString () {
    return `Item(${JSON.stringify({ itemId: this.id, parentId: this.parent?.id, itemType: this.type })})`;
  }

  get readOnly () {
    return !this._writeStream || this._deleted;
  }

  get deleted () {
    return this._deleted;
  }

  get parent (): Item<any> | null {
    return this._parent;
  }

  get children (): Item<any>[] {
    return Array.from(this._children.values()).filter(item => !item.deleted);
  }

  get links (): Link<any, any, any>[] {
    return Array.from(this._links.values()).filter(link => !link._isDangling());
  }

  get refs (): Link<any, any, any>[] {
    return Array.from(this._refs.values()).filter(link => !link._isDangling());
  }

  /**
   * Returns a selection context, which can be used to traverse the object graph starting from this item.
   */
  select (): Selection<Item<any>> {
    return createItemSelection(this as Item, this._itemManager.debouncedUpdate, undefined);
  }

  /**
   * Delete the item.
   */
  // TODO(burdon): Referential integrity (e.g., delete/hide children?)
  // TODO(burdon): Queries should skip deleted items (unless requested).
  // TODO(burdon): Garbage collection (snapshots should drop deleted items).
  // TODO(burdon): Prevent updates to model if deleted.
  // TODO(burdon): If deconstructed (itemManager.deconstructItem) then how to query?
  async delete () {
    if (!this._writeStream) {
      throw new Error(`Item is read-only: ${this.id}`);
    }
    if (this.deleted) {
      return;
    }

    const onUpdate = this._onUpdate.waitFor(() => this.deleted);

    await this._writeStream.write({
      itemId: this.id,
      itemMutation: {
        action: ItemMutation.Action.DELETE
      }
    });

    await onUpdate;
  }

  /**
   * Restore deleted item.
   */
  async restore () {
    if (!this._writeStream) {
      throw new Error(`Item is read-only: ${this.id}`);
    }
    if (!this.deleted) {
      throw new Error(`Item was note delted: ${this.id}`);
    }

    const onUpdate = this._onUpdate.waitFor(() => !this.deleted);

    await this._writeStream.write({
      itemId: this.id,
      itemMutation: {
        action: ItemMutation.Action.RESTORE
      }
    });

    await onUpdate;
  }

  // TODO(telackey): This does not allow null or undefined as a parentId, but should it since we allow a null parent?
  async setParent (parentId: ItemID): Promise<void> {
    if (!this._writeStream || this.readOnly) {
      throw new Error(`Item is read-only: ${this.id}`);
    }

    // Wait for mutation below to be processed.
    // TODO(burdon): Refine to wait for this specific mutation.
    const onUpdate = this._onUpdate.waitFor(() => parentId === this._parent?.id);

    await this._writeStream.write({
      itemId: this.id,
      itemMutation: {
        parentId
      }
    });

    await onUpdate;
  }

  /**
   * Process a mutation from the stream.
   * @private (Package-private).
   */
  _processMutation (mutation: ItemMutation, getItem: (itemId: ItemID) => Item<any> | undefined) {
    log('_processMutation %s', JSON.stringify(mutation));

    const { action, parentId } = mutation;

    switch (action) {
      case ItemMutation.Action.DELETE: {
        this._deleted = true;
        break;
      }

      case ItemMutation.Action.RESTORE: {
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
  private _updateParent (parent: Item<any> | null | undefined) {
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
