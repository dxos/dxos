//
// Copyright 2020 DXOS.org
//

import assert from 'assert';

import { ItemID, ItemType } from '@dxos/echo-protocol';
import { Model, ModelConstructor } from '@dxos/model-factory';

import { ResultSet } from '../result';
import { Item } from './item';
import { ItemFilter, ItemManager } from './item-manager';

export interface ItemCreationOptions<M> {
  model: ModelConstructor<M>
  type?: ItemType
  parrent?: ItemID
  props?: any // TODO(marik-d): Type this better.
}

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
   */
  // TODO(burdon): Get modelType from somewhere other than ObjectModel.meta.type.
  createItem <M extends Model<any>> (options: ItemCreationOptions<M>): Promise<Item<M>> {
    return this._getItemManager().createItem(options.model.meta.type, options.type, options.parrent, options.props);
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
