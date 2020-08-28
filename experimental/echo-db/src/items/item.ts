//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import pify from 'pify';

import { dxos, ItemID, ItemType } from '@dxos/experimental-echo-protocol';
import { Model } from '@dxos/experimental-model-factory';
import { checkType } from '@dxos/experimental-util';

/**
 * Addressable data item.
 */
export class Item<M extends Model<any>> {
  private readonly _itemId: ItemID;
  private readonly _itemType?: ItemType; // TODO(burdon): If optional, is this just a label (or "kind"?)
  private readonly _model: M;
  private readonly _writeStream?: NodeJS.WritableStream;
  private readonly _children = new Set<Item<any>>();

  /**
   * Items are constructed by a `Party` object.
   * @param {ItemID} itemId - Addressable ID.
   * @param {ItemType} itemType - User defined type (WRN).
   * @param {Model} model - Data model (provided by `ModelFactory`).
   * @param [writeStream] - Write stream if not read-only.
   */
  constructor (itemId: ItemID, itemType: ItemType, model: M, writeStream?: NodeJS.WritableStream) {
    assert(itemId);
    assert(model);
    this._itemId = itemId;
    this._itemType = itemType;
    this._model = model;
    this._writeStream = writeStream;
  }

  toString () {
    return `Item(${JSON.stringify({ itemId: this._itemId, itemType: this._itemType })})`;
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

  get children (): Item<any>[] {
    return Array.from(this._children.values());
  }

  async addChild (item: Item<any>): Promise<void> {
    if (!this._writeStream) {
      throw new Error(`Read-only model: ${this._itemId}`);
    }

    await pify(this._writeStream.write.bind(this._writeStream))(checkType<dxos.echo.IEchoEnvelope>({
      itemId: this._itemId,
      childMutation: {
        itemId: item.id
      }
    }));
  }

  async removeChild (itemId: ItemID): Promise<void> {
    if (!this._writeStream) {
      throw new Error(`Read-only model: ${this._itemId}`);
    }

    await pify(this._writeStream.write.bind(this._writeStream))(checkType<dxos.echo.IEchoEnvelope>({
      itemId: this._itemId,
      childMutation: {
        operation: dxos.echo.ItemChildMutation.Operation.REMOVE,
        itemId
      }
    }));
  }

  _processMutation (mutation: dxos.echo.ItemChildMutation, getItem: (itemId: ItemID) => Item<any> | undefined) {
    const { operation, itemId } = mutation;
    switch (operation) {
      case dxos.echo.ItemChildMutation.Operation.REMOVE: {
        this._children.forEach(child => {
          if (child.id === itemId) {
            this._children.delete(child);
          }
        });
        break;
      }

      case dxos.echo.ItemChildMutation.Operation.ADD:
      default: {
        const child = getItem(itemId);
        assert(child);
        this._children.add(child);
        break;
      }
    }
  }
}
