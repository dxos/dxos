//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import pify from 'pify';

import { Event } from '@dxos/async';
import { protocol, ItemID, ItemType, PartyKey } from '@dxos/experimental-echo-protocol';
import { Model } from '@dxos/experimental-model-factory';
import { checkType } from '@dxos/experimental-util';

/**
 * A globally addressable data item.
 * Items are hermetic data structures contained within a Party. They may be hierarchical.
 * The Item data structure is governed by a Model class, which implements data consistency.
 */
export class Item<M extends Model<any>> {
  private readonly _partyKey: PartyKey;
  private readonly _itemId: ItemID;
  private readonly _itemType?: ItemType; // TODO(burdon): If optional, is this just a label (or "kind"?)
  private readonly _model: M;
  private readonly _writeStream?: NodeJS.WritableStream;

  // Parent item (or null if this item is a root item).
  private _parent: Item<any> | null = null;
  private readonly _children = new Set<Item<any>>();
  private readonly _parentChange = new Event<Item<any> | null>();

  /**
   * Items are constructed by a `Party` object.
   * @param {PartyKey} partyKey
   * @param {ItemID} itemId - Addressable ID.
   * @param {ItemType} itemType - User defined type (WRN).
   * @param {Model} model - Data model (provided by `ModelFactory`).
   * @param [writeStream] - Write stream if not read-only.
   * @param {Item<any>} [parent] - Parent Item (if not a root Item).
   */
  constructor (partyKey: PartyKey, itemId: ItemID, itemType: ItemType, model: M,
    writeStream?: NodeJS.WritableStream, parent?: Item<any> | null) {
    assert(partyKey);
    assert(itemId);
    assert(model);
    this._partyKey = partyKey;
    this._itemId = itemId;
    this._itemType = itemType;
    this._model = model;
    this._writeStream = writeStream;
    this._updateParent(parent);
  }

  toString () {
    return `Item(${JSON.stringify({ itemId: this._itemId, parentId: this.parent?.id, itemType: this._itemType })})`;
  }

  get partyKey (): PartyKey {
    return this._partyKey;
  }

  get id (): ItemID {
    return this._itemId;
  }

  get type (): ItemType | undefined {
    return this._itemType;
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

  async setParent (parentId: ItemID): Promise<void> {
    if (!this._writeStream) {
      throw new Error(`Read-only model: ${this._itemId}`);
    }

    const waitForProcessing = this._parentChange.waitFor((parent: Item<any> | null) => parentId === parent?.id);

    await pify(this._writeStream.write.bind(this._writeStream))(checkType<protocol.dxos.echo.IEchoEnvelope>({
      itemId: this._itemId,
      itemMutation: {
        parentId
      }
    }));

    // It would be very surprising for item.parent still to reference the old parent just after calling item.setParent.
    // To prevent that unexpected result, we wait for the mutation written above to be processed.
    await waitForProcessing;
  }

  _processMutation (mutation: protocol.dxos.echo.ItemMutation, getItem: (itemId: ItemID) => Item<any> | undefined) {
    const { parentId } = mutation;

    const parent = getItem(parentId);
    this._updateParent(parent);
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

    this._parentChange.emit(this._parent);
  }
}
