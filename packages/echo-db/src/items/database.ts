//
// Copyright 2020 DXOS.org
//

import assert from 'assert';

import { ItemID, ItemType } from '@dxos/echo-protocol';
import { Model, ModelConstructor, ModelType } from '@dxos/model-factory';

import { ResultSet } from '../result';
import { Item } from './item';
import { ItemFilter, ItemManager } from './item-manager';

/**
 * Represents a shared dataset containing queryable Items that are constructed from an ordered stream
 * of mutations.
 */
export class Database {
  constructor (
    // This needs to be a function to ensure that database can be created before ItemManager is initialized.
    // TODO(marik-d): Is there an easier way to do this?
    private readonly _itemManagerProvider: () => ItemManager | undefined
  ) {}

  /**
   * Creates a new item with the given queryable type and model.
   * @param model
   * @param itemType
   * @param parentId
   */
  // TODO(burdon): Get modelType from somewhere other than ObjectModel.meta.type.
  // TODO(burdon): Pass in { type, parent } as options.
  createItem <M extends Model<any>> (
    model: ModelConstructor<M>,
    itemType?: ItemType | undefined,
    parentId?: ItemID | undefined
  ): Promise<Item<M>> {
    return this._getItemManager().createItem(model.meta.type, itemType, parentId);
  }

  /**
   * Creates a new item with the given queryable type and model.
   * @param modelType
   * @param itemType
   * @param parentId
   */
  createItemByType (
    modelType: ModelType,
    itemType?: ItemType,
    parentId?: ItemID
  ): Promise<Item<Model<unknown>>> {
    return this._getItemManager().createItem(modelType, itemType, parentId);
  }

  /**
   * Queries for a set of Items matching the optional filter.
   * @param filter
   */
  queryItems (filter?: ItemFilter): ResultSet<Item<any>> {
    return this._getItemManager().queryItems(filter);
  }

  /**
   * Retrieves a item from the index.
   * @param itemId
   */
  getItem (itemId: ItemID): Item<any> | undefined {
    return this._getItemManager().getItem(itemId);
  }

  private _getItemManager () {
    const itemManager = this._itemManagerProvider();
    assert(itemManager, 'Database not open.');
    return itemManager;
  }
}
