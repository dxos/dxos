//
// Copyright 2020 DXOS.org
//

import assert from 'assert';

import { ItemID, ItemType } from '@dxos/experimental-echo-protocol';
import { Model } from '@dxos/experimental-model-factory';

/**
 * Atomic data item.
 */
export class Item<M extends Model<any>> {
  private readonly _itemId: ItemID;
  private readonly _itemType: ItemType;

  // TODO(burdon): System and user model?
  private readonly _model: M;

  constructor (itemId: ItemID, itemType: ItemType, model: M) {
    assert(itemId);
    assert(itemType);
    assert(model);
    this._itemId = itemId;
    this._itemType = itemType;
    this._model = model;
  }

  toString () {
    return `Item(${JSON.stringify({ itemId: this._itemId, itemType: this._itemType })})`;
  }

  get id (): ItemID {
    return this._itemId;
  }

  get type (): ItemType {
    return this._itemType;
  }

  get model (): M {
    return this._model;
  }
}
