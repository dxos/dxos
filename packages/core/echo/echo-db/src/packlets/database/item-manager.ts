//
// Copyright 2020 DXOS.org
//

import { failUndefined } from '@dxos/debug';
import { invariant } from '@dxos/invariant';
import { log, logInfo } from '@dxos/log';
import { Model, ModelFactory, ModelType } from '@dxos/model-factory';
import { ItemID } from '@dxos/protocols';
import { EchoObject } from '@dxos/protocols/proto/dxos/echo/object';

import { Item } from './item';

// TODO(dmaretskyi): Merge.
export type ItemConstructionOptions = {
  itemId: ItemID;
  modelType: ModelType;
};

/**
 * Manages the creation and indexing of items.
 */
export class ItemManager {
  /**
   * Map of active items.
   * @private
   */
  private readonly _entities = new Map<ItemID, Item<Model>>();

  @logInfo
  public _debugLabel: string | undefined;

  /**
   * @param _writeStream Outbound `dxos.echo.IEchoObject` mutation stream.
   */
  constructor(private readonly _modelFactory: ModelFactory) {}

  get entities() {
    return this._entities;
  }

  get items(): Item<any>[] {
    return Array.from(this._entities.values()).filter((item): item is Item<Model> => item instanceof Item);
  }

  async destroy() {
    log('destroying..');
    for (const item of this._entities.values()) {
      await item.destroy();
    }
    this._entities.clear();
  }

  /**
   * Adds new Item to the tracked set. Sets up events and notifies any listeners waiting for this Item to be constructed.
   */
  // TODO(burdon): Parent not used.
  private _addItem(item: Item<any>, parent?: Item<any> | null) {
    invariant(!this._entities.has(item.id));
    this._entities.set(item.id, item);
    log('New Item:', String(item));
  }

  /**
   * Constructs an item with the appropriate model.
   */
  constructItem({ itemId, modelType }: ItemConstructionOptions): Item<any> {
    invariant(itemId);
    invariant(modelType);
    if (this.entities.has(itemId)) {
      return this.entities.get(itemId)!;
    }

    const { constructor: modelConstructor } = this._modelFactory.getModel(modelType) ?? failUndefined();

    const item = new Item(this, itemId);
    item._debugLabel = this._debugLabel;
    item.initialize(modelConstructor);

    this._addItem(item);

    return item;
  }

  /**
   * Process a message directed to a specific model.
   * @param itemId Id of the item containing the model.
   * @param message Encoded model message
   */
  processMutation(itemId: ItemID, mutation: EchoObject.Mutation) {
    const item = this._entities.get(itemId);
    invariant(item);

    item.processMessage(mutation);
  }

  /**
   * Retrieves a item from the index.
   * @param itemId
   */
  getItem<M extends Model<any> = any>(itemId: ItemID): Item<M> | undefined {
    const item = this._entities.get(itemId);
    return item as Item<M> | undefined;
  }

  getUninitializedEntities(): Item<Model>[] {
    return Array.from(this._entities.values()).filter((item) => !item.initialized);
  }

  /**
   * Recursive method to unlink and remove items from the active set.
   * @param itemId
   */
  deconstructItem(itemId: ItemID) {
    const item = this._entities.get(itemId);
    invariant(item);

    this._entities.delete(itemId);
  }

  clear() {
    this._entities.clear();
  }

  /**
   * Reconstruct an item with a default model when that model becomes registered.
   * New model instance is created and streams are reconnected.
   */
  initializeModel(itemId: ItemID) {
    const item = this._entities.get(itemId);
    invariant(item);

    const model = this._modelFactory.getModel(item.modelType);
    invariant(model, 'Model not registered');

    item.initialize(model.constructor);
  }
}
