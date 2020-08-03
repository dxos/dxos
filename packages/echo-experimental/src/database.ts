//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';
import { EventEmitter } from 'events';
import pify from 'pify';

import { createId } from '@dxos/crypto';
import { trigger } from '@dxos/async';

import { dxos } from './proto/gen/testing';

import { Readable, Transform } from 'stream';
import { Constructor } from 'protobufjs';
import { assertType, LazyMap } from './util';

const log = debug('dxos:echo:database');

type ModelType = string;

type ItemID = string;

// TODO(burdon): Shim?
interface Hypercore {
  append (message: Message): void;
}

// TODO(burdon): Replace with protobuf envelope.
// TOOD(burdon): Basic tutorial: https://www.typescriptlang.org/docs/handbook/interfaces.html
interface Message {
  // eslint-disable-next-line camelcase
  __type_url: string;
  itemId: string;
  [key: string]: any;
}

export interface ModelMessage {
  // feedKey: string TODO(marik_d): Add metadata
  data: Message;
}

/**
 * Abstract base class for Models.
 */
export abstract class Model extends EventEmitter {
  static type: string;

  constructor (
    private _type: string,
    private _itemId: string,
    private _readable: NodeJS.ReadableStream,
    private _feed?: Hypercore
  ) {
    super();

    this._readable.pipe(new Transform({
      objectMode: true,
      transform: async (message, _, callback) => {
        await this.processMessage(message);

        this.emit('update');
        callback();
      }
    }));
  }

  get itemId () {
    return this._itemId;
  }

  /**
   * Write to the stream.
   * @param message
   */
  async write (message: Message) {
    assert(this._feed);
    await pify(this._feed.append.bind(this._feed))({ message });
  }

  /**
   * Process the message.
   * @abstract
   * @param {Object} message
   */
  async abstract processMessage (message: ModelMessage): Promise<void>;
}

/**
 * Creates Model instances from a registered collection of Model types.
 */
export class ModelFactory {
  private _models = new Map<ModelType, Constructor<Model>>();

  registerModel (type: ModelType, modelConstructor: Constructor<Model>) {
    assert(type);
    assert(modelConstructor);
    this._models.set(type, modelConstructor);
    return this;
  }

  // TODO(burdon): Require version.
  createModel (type: ModelType, itemId: ItemID, readable: NodeJS.ReadableStream, feed?: Hypercore) {
    const modelConstructor = this._models.get(type);
    if (modelConstructor) {
      // eslint-disable-next-line new-cap
      return new modelConstructor(type, itemId, readable, feed);
    }
  }
}

/**
 * Data item.
 */
export class Item {
  // eslint-disable-next-line no-useless-constructor
  constructor (
    private _itemId: ItemID,
    private _model: Model
  ) {}

  get id () {
    return this._itemId;
  }

  get model () {
    return this._model;
  }
}

/**
 * Manages creation and index of items.
 */
export class ItemManager extends EventEmitter {
  // Map of active items.
  private _items = new Map<ItemID, Item>();

  // TODO(burdon): Lint issue: Unexpected whitespace between function name and paren
  // Map of item promises (waiting for item construction after genesis message has been written).
  private _pendingItems = new Map<ItemID, (item: Item) => void>();

  // TODO(burdoN): Pass in writeable object stream to abstract hypercore.
  constructor (
    private _modelFactory: ModelFactory,
    private _feed: Hypercore
  ) {
    super();
    assert(this._modelFactory);
    assert(this._feed);
  }

  /**
   * Creates an item and writes the genesis message.
   * @param type model type
   */
  async createItem (type: ModelType): Promise<Item> {
    const itemId = createId();

    // Pending until constructed (after genesis block is read from stream).
    const [waitForCreation, callback] = trigger();
    this._pendingItems.set(itemId, callback);

    // Write Item Genesis block.
    log('Creating Genesis:', itemId);
    await pify(this._feed.append.bind(this._feed))({
      message: {
        __type_url: 'dxos.echo.testing.TestItemGenesis',
        model: type,
        itemId
      }
    });

    // Unlocked by construct.
    return await waitForCreation();
  }

  /**
   * Creates a data item and writes the genesis block to the stream.
   * @param type
   * @param itemId
   * @param readable
   */
  async constructItem (type: string, itemId: string, readable: NodeJS.ReadableStream) {
    const model = this._modelFactory.createModel(type, itemId, readable, this._feed);
    assert(model);

    const item = new Item(itemId, model);

    assert(!this._items.has(itemId));
    this._items.set(itemId, item);

    // Notify pending creates.
    // TODO(burdon): Lint issue.
    // eslint-disable-next-line no-unused-expressions
    this._pendingItems.get(itemId)?.(item);

    this.emit('create', item);

    return item;
  }

  /**
   * Retrieves a data item from the index.
   * @param itemId
   */
  getItem (itemId: string) {
    return this._items.get(itemId);
  }

  /**
   * Return all items.
   */
  // TODO(burdon): Later convert to query.
  getItems () {
    return Array.from(this._items.values());
  }
}

/**
 * Reads party stream and routes to associate item stream.
 */
export const createItemDemuxer = (itemManager: ItemManager) => {
  // Map of Item-specific streams.
  // TODO(burdon): Abstract class.
  const streams = new LazyMap<string, Readable>(() => new Readable({
    objectMode: true,
    read () {}
  }));

  // TODO(burdon): Could this implement some "back-pressure" (hints) to the PartyProcessor?
  return new Transform({
    objectMode: true,

    // TODO(burdon): Is codec working? (expect envelope to be decoded.)
    transform: async ({ data: { message } }, _, callback) => {
      /* eslint-disable camelcase */
      const { __type_url, itemId } = message;
      assert(__type_url);
      assert(itemId);

      switch (__type_url) {
        case 'dxos.echo.testing.TestItemGenesis': {
          assertType<dxos.echo.testing.ITestItemGenesis>(message);
          assert(message.model);

          log(`Item Genesis: ${itemId}`);
          const stream = streams.getOrInit(itemId);
          await itemManager.constructItem(message.model, itemId, stream);
          break;
        }

        case 'dxos.echo.testing.TestItemMutation': {
          assertType<dxos.echo.testing.ITestItemMutation>(message);
          assert(message);

          const stream = streams.getOrInit(itemId);
          stream.push({ data: message });
        }
      }

      callback();
    }
  });
};
