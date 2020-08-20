//
// Copyright 2020 DXOS.org
//

import assert from 'assert';

import { Model } from '../models';
import { ItemID, ItemType } from './types';

/**
 * Atomic data item.
 */
export class Item {
  private readonly _itemId: ItemID;
  private readonly _itemType: ItemType;

  // TODO(burdon): System and user model.
  private readonly _model: Model<any>;

  constructor (itemId: ItemID, itemType: ItemType, model: Model<any>) {
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

  get model (): Model<any> {
    return this._model;
  }
}
