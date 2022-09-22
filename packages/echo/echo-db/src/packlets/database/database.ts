//
// Copyright 2020 DXOS.org
//

import assert from 'node:assert';

import { Event, synchronized } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { Model, ModelConstructor, ModelFactory, validateModelClass } from '@dxos/model-factory';
import { ObjectModel } from '@dxos/object-model';
import { ItemType, ItemID } from '@dxos/protocols';
import { DatabaseSnapshot } from '@dxos/protocols/proto/dxos/echo/snapshot';

import { DataServiceHost } from './data-service-host';
import { DatabaseBackend } from './database-backend';
import { Entity } from './entity';
import { Item } from './item';
import { ItemManager } from './item-manager';
import { Link } from './link';
import { RootFilter, Selection, createSelection } from './selection';

export interface CreateItemOption<M extends Model> {
  model?: ModelConstructor<M>
  type?: ItemType
  parent?: ItemID
  props?: any // TODO(marik-d): Type this better. Rename properties?
}

export interface CreateLinkOptions<M extends Model, L extends Model, R extends Model> {
  model?: ModelConstructor<M>
  type?: ItemType
  source: Item<L>
  target: Item<R>
  props?: any // TODO(marik-d): Type this better.
}

export enum State {
  NULL = 'NULL',
  INITIALIZED = 'INITIALIZED',
  DESTROYED = 'DESTROYED',
}

/**
 * Represents a shared dataset containing queryable Items that are constructed from an ordered stream of mutations.
 */
export class Database {
  private readonly _itemManager: ItemManager;

  private _state = State.NULL;

  /**
   * Creates a new database instance. `database.initialize()` must be called afterwards to complete the initialization.
   */
  constructor (
    private readonly _modelFactory: ModelFactory,
    private readonly _backend: DatabaseBackend,
    memberKey: PublicKey
  ) {
    this._itemManager = new ItemManager(this._modelFactory, memberKey, this._backend.getWriteStream());
  }

  get state () {
    return this._state;
  }

  get isReadOnly () {
    return this._backend.isReadOnly;
  }

  /**
   * Fired when any item is updated.
   * Contains a list of all entities changed from the last update.
   */
  get update (): Event<Entity<any>[]> {
    return this._itemManager.debouncedUpdate;
  }

  /**
   * Fired immediately after any update in the entities.
   * If the information about which entity got updated is not required prefer using `update`.
   */
  // TODO(burdon): Unused?
  get entityUpdate (): Event<Entity<any>> {
    return this._itemManager.update;
  }

  @synchronized
  async initialize () {
    if (this._state !== State.NULL) {
      throw new Error('Invalid state: database was already initialized.');
    }

    await this._backend.open(this._itemManager, this._modelFactory);
    this._state = State.INITIALIZED;
  }

  @synchronized
  async destroy () {
    if (this._state === State.DESTROYED || this._state === State.NULL) {
      return;
    }

    await this._backend.close();
    this._state = State.DESTROYED;
  }

  /**
   * Creates a new item with the given queryable type and model.
   */
  async createItem <M extends Model<any>> (options: CreateItemOption<M> = {}): Promise<Item<M>> {
    this._assertInitialized();
    if (!options.model) {
      options.model = ObjectModel as any as ModelConstructor<M>;
    }

    validateModelClass(options.model);

    if (options.type && typeof options.type !== 'string' as ItemType) {
      throw new TypeError('Invalid type.');
    }

    if (options.parent && typeof options.parent !== 'string' as ItemID) {
      throw new TypeError('Optional parent item id must be a string id of an existing item.');
    }

    // TODO(burdon): Get modelType from somewhere other than `ObjectModel.meta.type`.
    return await this._itemManager.createItem(
      options.model.meta.type, options.type, options.parent, options.props) as any;
  }

  async createLink<M extends Model<any>, S extends Model<any>, T extends Model<any>> (
    options: CreateLinkOptions<M, S, T>
  ): Promise<Link<M, S, T>> {
    this._assertInitialized();

    const model = options.model ?? ObjectModel;
    if (!model) {
      throw new TypeError('Missing model class.');
    }

    validateModelClass(model);

    if (options.type && typeof options.type !== 'string' as ItemType) {
      throw new TypeError('Invalid type.');
    }

    return this._itemManager.createLink(
      model.meta.type, options.type, options.source.id, options.target.id, options.props);
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
  // TODO(burdon): Generalize waitForCondition.
  async waitForItem<T extends Model<any>> (filter: RootFilter): Promise<Item<T>> {
    const result = this.select(filter).exec();
    await result.update.waitForCondition(() => result.entities.length > 0);
    const item = result.expectOne();
    assert(item, 'Possible race condition detected.');
    return item as Item<T>;
  }

  /**
   * Returns a selection context, which can be used to traverse the object graph.
   * @param filter
   */
  select (filter?: RootFilter): Selection<Item<any>> {
    return createSelection<void>(
      () => this._itemManager.items,
      () => this._itemManager.debouncedUpdate,
      this,
      filter,
      undefined
    );
  }

  /**
   * Returns a reducer selection context.
   * @param result
   * @param filter
   */
  reduce<R> (result: R, filter?: RootFilter): Selection<Item<any>, R> {
    return createSelection<R>(
      () => this._itemManager.items,
      () => this._itemManager.debouncedUpdate,
      this,
      filter,
      result
    );
  }

  createSnapshot (): DatabaseSnapshot {
    this._assertInitialized();
    return this._backend.createSnapshot();
  }

  createDataServiceHost (): DataServiceHost {
    return this._backend.createDataServiceHost();
  }

  private _assertInitialized () {
    if (this._state !== State.INITIALIZED) {
      throw new Error('Database not initialized.');
    }
  }
}
