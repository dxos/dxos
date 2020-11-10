//
// Copyright 2020 DXOS.org
//

import { Event } from '@dxos/async';
import { EchoEnvelope, ItemID, ItemMutation, ItemType, FeedWriter } from '@dxos/echo-protocol';
import { Model, ModelMeta } from '@dxos/model-factory';

/**
 * A globally addressable data item.
 * Items are hermetic data structures contained within a Party. They may be hierarchical.
 * The Item data structure is governed by a Model class, which implements data consistency.
 */
export class Item<M extends Model<any>> {
  // Parent item (or null if this item is a root item).
  private _parent: Item<any> | null = null;
  private readonly _children = new Set<Item<any>>();
  private readonly _onUpdate = new Event<this>();

  /**
   * Items are constructed by a `Party` object.
   * @param {ItemID} itemId - Addressable ID.
   * @param {ItemType} itemType - User defined type (WRN).
   * @param {Model} model - Data model (provided by `ModelFactory`).
   * @param [writeStream] - Write stream if not read-only.
   * @param {Item<any>} [parent] - Parent Item (if not a root Item).
   */
  constructor (
    private readonly _itemId: ItemID,
    private readonly _itemType: ItemType | undefined,
    private readonly _modelMeta: ModelMeta,
    private readonly _model: M,
    private readonly _writeStream?: FeedWriter<EchoEnvelope>,
    parent?: Item<any> | null
  ) {
    this._updateParent(parent);

    // Model updates mean Item updates, so make sure we are subscribed as well.
    this._onUpdate.addEffect(() => this._model.subscribe(() => this._onUpdate.emit(this)));
  }

  toString () {
    return `Item(${JSON.stringify({ itemId: this._itemId, parentId: this.parent?.id, itemType: this._itemType })})`;
  }

  get id (): ItemID {
    return this._itemId;
  }

  get type (): ItemType | undefined {
    return this._itemType;
  }

  get modelMeta (): ModelMeta {
    return this._modelMeta;
  }

  get model (): M {
    return this._model;
  }

  get readOnly () {
    return !!this._writeStream;
  }

  get parent (): Item<any> | null {
    return this._parent;
  }

  get children (): Item<any>[] {
    return Array.from(this._children.values());
  }

  /**
   * Subscribe for updates.
   * @param listener
   */
  subscribe (listener: (item: Item<M>) => void) {
    return this._onUpdate.on(listener);
  }

  // TODO(telackey): This does not allow null or undefined as a parentId, but should it since we allow a null parent?
  async setParent (parentId: ItemID): Promise<void> {
    if (!this._writeStream) {
      throw new Error(`Read-only model: ${this._itemId}`);
    }

    const waitForProcessing = this._onUpdate.waitFor(() => parentId === this._parent?.id);

    await this._writeStream.write({
      itemId: this._itemId,
      itemMutation: {
        parentId
      }
    });

    // It would be very surprising for item.parent still to reference the old parent just after calling item.setParent.
    // To prevent that unexpected result, we wait for the mutation written above to be processed.
    await waitForProcessing;
  }

  _processMutation (mutation: ItemMutation, getItem: (itemId: ItemID) => Item<any> | undefined) {
    const { parentId } = mutation;

    if (parentId) {
      const parent = getItem(parentId);
      this._updateParent(parent);
    }

    this._onUpdate.emit(this);
  }

  _updateParent (parent: Item<any> | null | undefined) {
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
