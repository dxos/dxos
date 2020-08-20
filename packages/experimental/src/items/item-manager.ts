//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';
import pify from 'pify';

import { Event, trigger } from '@dxos/async';
import { createId } from '@dxos/crypto';

import { dxos } from '../proto/gen/testing';

import { ModelType, ModelFactory, Model, ModelMessage } from '../models';
import { Item } from './item';
import { IEchoStream, ItemID, ItemType } from './types';
import { ResultSet } from '../result';
import { createTransform } from '../util';

const log = debug('dxos:echo:item-manager');

export interface ItemFilter {
  type: ItemType
}

/**
 * Manages the creation and indexing of items.
 */
export class ItemManager {
  private readonly _itemUpdate = new Event<Item>();

  // Map of active items.
  private _items = new Map<ItemID, Item>();

  // TODO(burdon): Lint issue: Unexpected whitespace between function name and paren
  // Map of item promises (waiting for item construction after genesis message has been written).
  // eslint-disable-next-line
  private _pendingItems = new Map<ItemID, (item: Item) => void>();

  _modelFactory: ModelFactory;
  _writeStream?: NodeJS.WritableStream;

  /**
   * @param modelFactory
   * @param writeStream Outbound `dxos.echo.testing.IEchoEnvelope` mutation stream.
   */
  constructor (modelFactory: ModelFactory, writeStream?: NodeJS.WritableStream) {
    assert(modelFactory);
    this._modelFactory = modelFactory;
    this._writeStream = writeStream;
  }

  /**
   * Creates an item and writes the genesis message.
   * @param itemType item type
   * @param modelType model type
   */
  async createItem (itemType: ItemType, modelType: ModelType): Promise<Item> {
    assert(this._writeStream);
    assert(itemType);
    assert(modelType);

    // Pending until constructed (after genesis block is read from stream).
    const [waitForCreation, callback] = trigger();

    const itemId = createId();
    this._pendingItems.set(itemId, callback);

    // Write Item Genesis block.
    log('Writing Genesis:', itemId);
    const message: dxos.echo.testing.IEchoEnvelope = {
      itemId,
      genesis: {
        itemType,
        modelType
      }
    };

    // TODO(burdon): Push?
    await pify(this._writeStream.write.bind(this._writeStream))(message);

    // Unlocked by construct.
    log('Waiting for item...');
    return await waitForCreation();
  }

  /**
   * Constructs an item with the appropriate model.
   * @param itemId
   * @param itemType
   * @param modelType
   * @param readable Inbound mutation stream.
   */
  async constructItem (itemId: ItemID, itemType: ItemType, modelType: ModelType, readable: NodeJS.ReadableStream) {
    assert(this._writeStream);
    assert(itemId);
    assert(itemType);
    assert(modelType);
    assert(readable);

    // TODO(burdon): Skip genesis message (and subsequent messages) if unknown model. Build map of ignored items.
    if (!this._modelFactory.hasModel(modelType)) {
      throw new Error(`Unknown model: ${modelType}`);
    }

    //
    // Convert inbound mutation (to model).
    //
    const inboundTransform = createTransform<IEchoStream, ModelMessage<any>>(async (message: IEchoStream) => {
      const { meta, data: { itemId: mutationItemId, itemMutation } } = message;
      assert(mutationItemId === itemId);
      const response: ModelMessage<any> = {
        meta,
        mutation: itemMutation
      };

      return response;
    });

    //
    // Convert outbound mutation (from model).
    //
    const outboundTransform = createTransform<any, dxos.echo.testing.IEchoEnvelope>(async (message) => {
      const response: dxos.echo.testing.IEchoEnvelope = {
        itemId,
        itemMutation: message
      };

      return response;
    });

    // Create model.
    const model: Model<any> = this._modelFactory.createModel(modelType, itemId, outboundTransform);
    assert(model, `Invalid model: ${modelType}`);

    // Connect streams.
    // TODO(burdon): Do these unpipe automatically when the streams are closed/destroyed?
    outboundTransform.pipe(this._writeStream);

    // TODO(burdon): Dispatch or data model?
    readable.pipe(inboundTransform).pipe(model.processor);

    // Create item.
    const item = new Item(itemId, itemType, model);
    assert(!this._items.has(itemId));
    this._items.set(itemId, item);
    log('Constructed:', String(item));

    // Item udpated.
    // TODO(burdon): Update the item directly?
    this._itemUpdate.emit(item);

    // Notify pending creates.
    this._pendingItems.get(itemId)?.(item);
    return item;
  }

  /**
   * Retrieves a item from the index.
   * @param itemId
   */
  getItem (itemId: ItemID): Item | undefined {
    return this._items.get(itemId);
  }

  /**
   * Return matching items.
   * @param [filter]
   */
  async queryItems (filter?: ItemFilter): Promise<ResultSet<Item>> {
    const { type } = filter || {};
    return new ResultSet<Item>(this._itemUpdate, () => Array.from(this._items.values())
      .filter(item => !type || type === item.type));
  }
}
