//
// Copyright 2020 DXOS.org
//

import { EchoEnvelope, ItemID, ItemMutation, ItemType, FeedWriter } from '@dxos/echo-protocol';
import { Model, ModelMeta } from '@dxos/model-factory';

import { Entity } from './entity';
import type { Link } from './link';
import { Selection } from './selection';

/**
 * A globally addressable data item.
 * Items are hermetic data structures contained within a Party. They may be hierarchical.
 * The Item data structure is governed by a Model class, which implements data consistency.
 */
export class Item<M extends Model> extends Entity<M> {
  // Parent item (or null if this item is a root item).
  private _parent: Item<any> | null = null;

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
   * @param {ItemID} _itemId      - Addressable ID.
   * @param {ItemType} _itemType  - User defined type (DXN).
   * @param {Model} _modelMeta    - Data model metadata.
   * @param {Model} _model        - Data model (provided by `ModelFactory`).
   * @param [_writeStream]        - Write stream (if not read-only).
   * @param {Item<any>} [parent]  - Parent Item (if not a root Item).
   * @param {LinkData} [link]
   */
  constructor (
    itemId: ItemID,
    itemType: ItemType | undefined, // TODO(burdon): Why undefined?
    modelMeta: ModelMeta,
    model: M,
    private readonly _writeStream?: FeedWriter<EchoEnvelope>,
    parent?: Item<any> | null
  ) {
    super(itemId, itemType, modelMeta, model);

    this._updateParent(parent);
  }

  override toString () {
    return `Item(${JSON.stringify({ itemId: this.id, parentId: this.parent?.id, itemType: this.type })})`;
  }

  get readOnly () {
    return !this._writeStream;
  }

  get parent (): Item<any> | null {
    return this._parent;
  }

  get children (): Item<any>[] {
    return Array.from(this._children.values());
  }

  get links (): Link<any, any, any>[] {
    return Array.from(this._links.values()).filter(link => !link._isDangling());
  }

  get refs (): Link<any, any, any>[] {
    return Array.from(this._refs.values()).filter(link => !link._isDangling());
  }

  // TODO(burdon): Experimental. (Event?)
  select (): Selection<any> {
    // TODO(unknown): Update should be triggered when item's child set or any related links change.
    return new Selection(() => [this], this._onUpdate.discardParameter());
  }

  // TODO(telackey): This does not allow null or undefined as a parentId, but should it since we allow a null parent?
  async setParent (parentId: ItemID): Promise<void> {
    if (!this._writeStream) {
      throw new Error(`Read-only model: ${this.id}`);
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
   * Process a mutation on this item. Package-private.
   * @private
   */
  _processMutation (mutation: ItemMutation, getItem: (itemId: ItemID) => Item<any> | undefined) {
    const { parentId } = mutation;

    if (parentId) {
      const parent = getItem(parentId);
      this._updateParent(parent);
    }

    this._onUpdate.emit(this);
  }

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
