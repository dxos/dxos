//
// Copyright 2020 DXOS.org
//

import assert from 'assert';

import { synchronized } from '@dxos/async';
import { ItemID, ItemType } from '@dxos/echo-protocol';
import { Model, ModelConstructor, ModelFactory, validateModelClass } from '@dxos/model-factory';
import { ObjectModel } from '@dxos/object-model';

import { DataServiceHost } from './data-service-host';
import { DatabaseBackend } from './database-backend';
import { Item } from './item';
import { ItemManager } from './item-manager';
import { Link } from './link';
import { SelectFilter, Selection, SelectionResult } from './selection';

export interface ItemCreationOptions<M> {
  model: ModelConstructor<M>
  type?: ItemType
  parent?: ItemID
  props?: any // TODO(marik-d): Type this better.
}

export interface LinkCreationOptions<M, L extends Model<any>, R extends Model<any>> {
  model?: ModelConstructor<M>
  type?: ItemType
  source: Item<L>
  target: Item<R>
  props?: any // TODO(marik-d): Type this better.
}

enum State {
  INITIAL = 'INITIAL',
  OPEN = 'OPEN',
  DESTROYED = 'DESTROYED',
}

/**
 * Represents a shared dataset containing queryable Items that are constructed from an ordered stream
 * of mutations.
 */
export class Database {
  private readonly _itemManager: ItemManager;

  private _state = State.INITIAL;

  /**
   * Creates a new database instance. `database.init()` must be called afterwards to complete the initialization.
   */
  constructor (
    private readonly _modelFactory: ModelFactory,
    private readonly _backend: DatabaseBackend
  ) {
    this._itemManager = new ItemManager(this._modelFactory, this._backend.getWriteStream());
  }

  get isReadOnly () {
    return this._backend.isReadOnly;
  }

  get update () {
    return this._itemManager.debouncedItemUpdate;
  }

  @synchronized
  async init () {
    if (this._state !== State.INITIAL) {
      throw new Error('Invalid state: database was already initialized.');
    }

    await this._backend.open(this._itemManager, this._modelFactory);
    this._state = State.OPEN;
  }

  @synchronized
  async destroy () {
    if (this._state === State.DESTROYED || this._state === State.INITIAL) {
      return;
    }

    await this._backend.close();
    this._state = State.DESTROYED;
  }

  /**
   * Creates a new item with the given queryable type and model.
   */
  // TODO(burdon): Get modelType from somewhere other than `ObjectModel.meta.type`.
  async createItem <M extends Model<any>> (options: ItemCreationOptions<M>): Promise<Item<M>> {
    this._assertInitialized();

    if (!options.model) {
      throw new TypeError('Missing model class.');
    }

    validateModelClass(options.model);

    if (options.type && typeof options.type !== 'string') {
      throw new TypeError('Invalid type.');
    }

    if (options.parent && typeof options.parent !== 'string') {
      throw new TypeError('Optional parent item id must be a string id of an existing item.');
    }

    return this._itemManager.createItem(options.model.meta.type, options.type, options.parent, options.props) as any;
  }

  async createLink<M extends Model<any>, S extends Model<any>, T extends Model<any>> (
    options: LinkCreationOptions<M, S, T>
  ): Promise<Link<M, S, T>> {
    this._assertInitialized();

    const model = options.model ?? ObjectModel;
    if (!model) {
      throw new TypeError('Missing model class.');
    }

    validateModelClass(model);

    if (options.type && typeof options.type !== 'string') {
      throw new TypeError('Invalid type.');
    }

    assert(options.source instanceof Item);
    assert(options.target instanceof Item);

    return this._itemManager
      .createLink(model.meta.type, options.type, options.source.id, options.target.id, options.props);
  }

  /**
   * Retrieves a item from the index.
   * @param itemId
   */
  getItem (itemId: ItemID): Item<any> | undefined {
    this._assertInitialized();
    return this._itemManager.getItem(itemId);
  }

  /**
   * Waits for item matching the filter to be present and returns it.
   */
  async waitForItem<T extends Model<any> = any> (filter: SelectFilter<Item<T>>): Promise<Item<T>> {
    const query = this.select(s => s.filter(filter).items);
    if (query.getValue().length > 0) {
      return query.getValue()[0];
    } else {
      const [item] = await query.update.waitFor(items => items.length > 0);
      return item;
    }
  }

  /**
   * Returns a selection context, which can be used to traverse the object graph.
   * @param [selector] {SelectFilter}
   */
  select<T> (selector: (selection: Selection<Item<any>>) => T): SelectionResult<T> {
    const result = this._itemManager.queryItems({});
    const selection = new Selection(() => result.value, result.update.discardParameter());
    return new SelectionResult(selection, selector);
  }

  createSnapshot () {
    this._assertInitialized();
    return this._backend.createSnapshot();
  }

  createDataServiceHost (): DataServiceHost {
    return this._backend.createDataServiceHost();
  }

  private _assertInitialized () {
    if (this._state !== State.OPEN) {
      throw new Error('Database not initialized.');
    }
  }
}
