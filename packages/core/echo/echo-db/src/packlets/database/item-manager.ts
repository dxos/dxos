//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import assert from 'node:assert';

import { Event, trigger } from '@dxos/async';
import { Any } from '@dxos/codec-protobuf';
import { createId } from '@dxos/crypto';
import { failUndefined, timed } from '@dxos/debug';
import { FeedWriter } from '@dxos/feed-store';
import { PublicKey } from '@dxos/keys';
import { log, logInfo } from '@dxos/log';
import { Model, ModelFactory, ModelMessage, ModelType } from '@dxos/model-factory';
import { ItemID } from '@dxos/protocols';
import { DataMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { EchoObject } from '@dxos/protocols/proto/dxos/echo/object';

import { UnknownModelError } from '../errors';
import { Item } from './item';

// TODO(dmaretskyi): Merge.
export type ItemConstructionOptions = {
  itemId: ItemID;
  modelType: ModelType;
}

/**
 * Manages the creation and indexing of items.
 */
export class ItemManager {
  /**
   * Fired immediately after any update in the entities.
   *
   * If the information about which Item got updated is not required prefer using `debouncedItemUpdate`.
   */
  readonly update = new Event<Item<Model>>();

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
  constructor(
    private readonly _modelFactory: ModelFactory,
  ) { }

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
    assert(!this._entities.has(item.id));
    this._entities.set(item.id, item);
    log('New Item:', String(item));

    // Notify Item was udpated.
    // TODO(burdon): Update the item directly?
    this.update.emit(item);

    // TODO(telackey): Unsubscribe?
    item.subscribe(() => {
      this.update.emit(item);
    });
  }

  /**
   * Constructs an item with the appropriate model.
   */
  constructItem({ itemId, modelType }: ItemConstructionOptions): Item<any> {
    assert(itemId);
    assert(modelType);
    if (this.entities.has(itemId)) {
      log.info('init twice')
      return this.entities.get(itemId)!;
    }

    const { constructor: modelConstructor } = this._modelFactory.getModel(modelType) ?? failUndefined();

    const item = new Item(this, itemId);
    item._debugLabel = this._debugLabel;
    item.initialize(modelConstructor)

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
    assert(item);

    item.processMessage(mutation);
    this.update.emit(item);
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
    assert(item);

    this._entities.delete(itemId);
  }

  /**
   * Reconstruct an item with a default model when that model becomes registered.
   * New model instance is created and streams are reconnected.
   */
  initializeModel(itemId: ItemID) {
    const item = this._entities.get(itemId);
    assert(item);

    const model = this._modelFactory.getModel(item.modelType);
    assert(model, 'Model not registered');

    item.initialize(model.constructor);

    this.update.emit(item);
  }
}
