//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import assert from 'node:assert';

import { Event, trigger } from '@dxos/async';
import { Any } from '@dxos/codec-protobuf';
import { createId } from '@dxos/crypto';
import { timed } from '@dxos/debug';
import { FeedWriter } from '@dxos/feed-store';
import { PublicKey } from '@dxos/keys';
import { Model, ModelFactory, ModelMessage, ModelType, StateManager } from '@dxos/model-factory';
import { ItemID, ItemType } from '@dxos/protocols';
import { DataMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { EchoObject } from '@dxos/protocols/proto/dxos/echo/object';

import { createMappedFeedWriter } from '../common';
import { UnknownModelError } from '../errors';
import { Item } from './item';

const log = debug('dxos:echo-db:item-manager');

export interface ModelConstructionOptions {
  itemId: ItemID;
  modelType: ModelType;
  snapshot: EchoObject;
}

export interface ItemConstructionOptions extends ModelConstructionOptions {
  itemType: ItemType | undefined;
  parentId?: ItemID;
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
   * Update event.
   * Contains a list of all entities changed from the last update.
   */
  readonly debouncedUpdate: Event<Item[]> = debounceItemUpdateEvent(this.update);

  /**
   * Map of active items.
   * @private
   */
  private readonly _entities = new Map<ItemID, Item<Model>>();

  /**
   * Map of item promises (waiting for item construction after genesis message has been written).
   * @private
   */
  private readonly _pendingItems = new Map<ItemID, (item: Item<Model>) => void>();

  /**
   * @param _writeStream Outbound `dxos.echo.IEchoObject` mutation stream.
   */
  constructor(
    private readonly _modelFactory: ModelFactory,
    private readonly _memberKey: PublicKey,
    private readonly _writeStream?: FeedWriter<DataMessage>
  ) {}

  get entities() {
    return this._entities;
  }

  get items(): Item<any>[] {
    return Array.from(this._entities.values()).filter((item): item is Item<Model> => item instanceof Item);
  }

  async destroy() {
    log('destroying..');
    for (const item of this._entities.values()) {
      await item._destroy();
    }
    this._entities.clear();
  }

  /**
   * Creates an item and writes the genesis message.
   * @param {ModelType} modelType
   * @param {ItemType} [itemType]
   * @param {ItemID} [parentId]
   * @param initProps
   */
  @timed(5_000)
  async createItem(
    modelType: ModelType,
    itemId: ItemID = createId(),
    itemType?: ItemType,
    parentId?: ItemID,
    initProps?: any // TODO(burdon): Remove/change to array of mutations.
  ): Promise<Item<Model<unknown>>> {
    assert(this._writeStream); // TODO(burdon): Throw ReadOnlyError();
    assert(modelType);

    if (!this._modelFactory.hasModel(modelType)) {
      throw new UnknownModelError(modelType);
    }

    let mutation: Uint8Array | undefined;
    if (initProps) {
      const meta = this._modelFactory.getModelMeta(modelType);
      if (!meta.getInitMutation) {
        throw new Error('Model does not support initializer.');
      }
      mutation = meta.mutationCodec.encode(await meta.getInitMutation(initProps));
    }

    // Pending until constructed (after genesis block is read from stream).
    const [waitForCreation, callback] = trigger<Item<any>>();

    this._pendingItems.set(itemId, callback);

    // Write Item Genesis block.
    log('Item Genesis', { itemId });
    await this._writeStream.write({
      object: {
        itemId,
        genesis: {
          itemType,
          modelType
        },
        itemMutation: parentId ? { parentId } : undefined,
        mutations: !mutation
          ? []
          : [
              {
                mutation: {
                  '@type': 'google.protobuf.Any',
                  type_url: 'todo', // TODO(mykola): Make model output google.protobuf.Any.
                  value: mutation
                }
              }
            ]
      }
    });

    // Unlocked by construct.
    log('Pending Item:', itemId);
    const item = await waitForCreation();
    assert(item instanceof Item);
    return item;
  }

  private async _constructModel({
    modelType,
    itemId,
    snapshot
  }: ModelConstructionOptions): Promise<StateManager<Model>> {
    // Convert model-specific outbound mutation to outbound envelope message.
    const outboundTransform =
      this._writeStream &&
      createMappedFeedWriter<Any, DataMessage>(
        (mutation: Any) => ({
          object: {
            itemId,
            mutations: [
              {
                mutation
              }
            ]
          }
        }),
        this._writeStream
      );

    // Create the model with the outbound stream.
    return this._modelFactory.createModel<Model>(modelType, itemId, snapshot, this._memberKey, outboundTransform);
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

    // Notify pending creates.
    this._pendingItems.get(item.id)?.(item);
  }

  /**
   * Constructs an item with the appropriate model.
   */
  @timed(5_000)
  async constructItem({
    itemId,
    itemType,
    modelType,
    parentId,
    snapshot
  }: ItemConstructionOptions): Promise<Item<any>> {
    assert(itemId);
    assert(modelType);

    const parent = parentId ? this._entities.get(parentId) : null;
    if (parentId && !parent) {
      throw new Error(`Missing parent: ${parentId}`);
    }
    assert(!parent || parent instanceof Item);

    const modelStateManager = await this._constructModel({
      itemId,
      modelType,
      snapshot
    });

    const item = new Item(this, itemId, itemType, modelStateManager, this._writeStream, parent);
    if (parent) {
      this.update.emit(parent);
    }
    this._addItem(item);

    return item;
  }

  /**
   * Process a message directed to a specific model.
   * @param itemId Id of the item containing the model.
   * @param message Encoded model message
   */
  async processModelMessage(itemId: ItemID, message: ModelMessage<Any>) {
    const item = this._entities.get(itemId);
    assert(item);

    await item._stateManager.processMessage(message.meta, message.mutation);
    this.update.emit(item);
  }

  /**
   * Retrieves a item from the index.
   * @param itemId
   */
  getItem<M extends Model<any> = any>(itemId: ItemID): Item<M> | undefined {
    const item = this._entities.get(itemId);
    return item as (Item<M> | undefined);
  }

  getUninitializedEntities(): Item<Model>[] {
    return Array.from(this._entities.values()).filter((Item) => !Item._stateManager.initialized);
  }

  /**
   * Recursive method to unlink and remove items from the active set.
   * @param itemId
   */
  deconstructItem(itemId: ItemID) {
    const item = this._entities.get(itemId);
    assert(item);

    this._entities.delete(itemId);

    if (item instanceof Item) {
      if (item.parent) {
        item.parent._children.delete(item);
      }

      for (const child of item.children) {
        this.deconstructItem(child.id);
      }
    }
  }

  /**
   * Reconstruct an item with a default model when that model becomes registered.
   * New model instance is created and streams are reconnected.
   */
  async initializeModel(itemId: ItemID) {
    const item = this._entities.get(itemId);
    assert(item);

    const model = this._modelFactory.getModel(item._stateManager.modelType);
    assert(model, 'Model not registered');

    item._stateManager.initialize(model.constructor);

    this.update.emit(item);
  }
}

/**
 * Returns a new event that groups all of the updates emitted during single tick into a single event emission.
 */
const debounceItemUpdateEvent = (event: Event<Item<any>>): Event<Item<any>[]> => {
  const debouncedEvent = new Event<Item<any>[]>();

  let firing = false;

  const emittedSinceLastFired = new Set<Item<any>>();
  debouncedEvent.addEffect(() =>
    event.on((arg) => {
      emittedSinceLastFired.add(arg);
      if (!firing) {
        firing = true;
        setTimeout(() => {
          firing = false;
          const args = Array.from(emittedSinceLastFired);
          emittedSinceLastFired.clear();
          debouncedEvent.emit(args);
        }, 0);
      }
    })
  );

  return debouncedEvent;
};
