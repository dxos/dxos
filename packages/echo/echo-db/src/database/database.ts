//
// Copyright 2020 DXOS.org
//

import assert from 'assert';

import { Event, synchronized } from '@dxos/async';
import { ItemID, ItemType } from '@dxos/echo-protocol';
import { Model, ModelConstructor, ModelFactory, validateModelClass } from '@dxos/model-factory';
import { ObjectModel } from '@dxos/object-model';

import { DataServiceHost } from './data-service-host';
import { DatabaseBackend } from './database-backend';
import { Entity } from './entity';
import { Item } from './item';
import { ItemManager } from './item-manager';
import { Link } from './link';
import { Selection, SelectionResult, createRootSelector, RootFilter } from './selection';

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

  /**
   * Fired when any item is updated.
   */
  get update (): Event<void> {
    return this._itemManager.debouncedItemUpdate;
  }

  /**
   * Fired immediately after any update in the entities.
   *
   * If the information about which entity got updated is not required prefer using `update`.
   */
  get entityUpdate (): Event<Entity<any>> {
    return this._itemManager.itemUpdate;
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
  async waitForItem<T extends Model<any> = any> (filter: RootFilter): Promise<Item<T>> {
    const query = this.select(filter).query();
    await query.update.waitForCondition(() => {
      const { result } = query;
      return Array.isArray(result) ? result.length > 0 : result !== undefined
    });
    const item = Array.isArray(query.result) ? query.result[0] : query.result
    assert(item, 'Race condition detected');
    return item;
  }

  /**
   * Returns a selection context, which can be used to traverse the object graph.
   * @param selector {SelectFilter}
   * @param [filter]
   */
  select = createRootSelector(
    () => Array.from(this._itemManager.entities.values()).filter((entity): entity is Item<any> => entity instanceof Item),
    () => this._itemManager.itemUpdate as any,
    this,
  );

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
