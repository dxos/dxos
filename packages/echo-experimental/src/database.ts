//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';
import { EventEmitter } from 'events';
import { Feed } from 'hypercore';
import pify from 'pify';
import { Constructor } from 'protobufjs';
import { Readable, Transform, Writable } from 'stream';

import { createId, keyToString } from '@dxos/crypto';
import { trigger } from '@dxos/async';
import { FeedStore } from '@dxos/feed-store';

import { dxos } from './proto/gen/testing';

import { assumeType, LazyMap, assertAnyType } from './util';
import { FeedStoreIterator } from './feed-store-iterator';

const log = debug('dxos:echo:database');

type ModelType = string;
type FeedKey = string;
type ItemID = string;

/**
 * Returns a stream that appends messages directly to a hypercore feed.
 * @param feed
 * @returns {NodeJS.WritableStream}
 */
export const createWritableFeedStream = (feed: Feed) => new Writable({
  objectMode: true,
  write (message, _, callback) {
    log('Write:', JSON.stringify(message));
    feed.append(message, callback);
  }
});

/**
 * Abstract base class for Models.
 */
export abstract class Model extends EventEmitter {
  static type: string;

  constructor (
    private _type: string,
    private _itemId: string,
    private _readable: NodeJS.ReadableStream,
    private _writable?: NodeJS.WritableStream
  ) {
    super();

    this._readable.pipe(new Transform({
      objectMode: true,
      transform: async (message, _, callback) => {
        log('Model.read', message);
        await this.processMessage(message);

        this.emit('update', this);
        callback();
      }
    }));
  }

  get itemId () {
    return this._itemId;
  }

  /**
   * Wraps the message within an ItemEnvelope then writes to the output stream.
   * @param message
   */
  async write (message: any) {
    assert(this._writable);
    log('Model.write:', JSON.stringify(message));
    await pify(this._writable.write.bind(this._writable))(message);
  }

  /**
   * Process the message.
   * @abstract
   * @param {Object} message
   */
  async abstract processMessage (message: dxos.echo.testing.FeedMessage): Promise<void>;
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
  createModel (type: ModelType, itemId: ItemID, readable: NodeJS.ReadableStream, writable?: NodeJS.WritableStream) {
    const modelConstructor = this._models.get(type);
    if (modelConstructor) {
      // eslint-disable-next-line new-cap
      return new modelConstructor(type, itemId, readable, writable);
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
 * Wraps messages with ItemEnvelope.
 * @param itemId
 * @returns {NodeJS.WritableStream}
 */
// TODO(burdon): Not a great abstraction.
const createItemMessageStream = (itemId: ItemID) => {
  return new Transform({
    objectMode: true,
    transform (message, _, callback) {
      this.push({
        message: {
          __type_url: 'dxos.echo.testing.ItemEnvelope',
          itemId,
          payload: message
        }
      });

      callback();
    }
  });
};

/**
 * Manages creation and index of items.
 */
export class ItemManager extends EventEmitter {
  // Map of active items.
  private _items = new Map<ItemID, Item>();

  // TODO(burdon): Lint issue: Unexpected whitespace between function name and paren
  // Map of item promises (waiting for item construction after genesis message has been written).
  // TODO(burdon): Lint error.
  // eslint-disable-next-line
  private _pendingItems = new Map<ItemID, (item: Item) => void>();

  constructor (
    private _modelFactory: ModelFactory,
    private _writable: NodeJS.WritableStream
  ) {
    super();
    assert(this._modelFactory);
    assert(this._writable);
  }

  // TODO(burdon): Don't bury pipe inside methods that create streams (side effects).
  private _createWriteStream (itemId: ItemID): NodeJS.WritableStream {
    const transform = createItemMessageStream(itemId);
    transform.pipe(this._writable);
    return transform;
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
    const writable = this._createWriteStream(itemId);
    // TODO(burdon): Is it possible to wait on writing to a stream?
    await pify(writable.write.bind(writable))({
      __type_url: 'dxos.echo.testing.ItemGenesis',
      model: type
    });

    // Unlocked by construct.
    log('Waiting for item...');
    return await waitForCreation();
  }

  /**
   * Creates a data item and writes the genesis block to the stream.
   * @param type
   * @param itemId
   * @param readable
   */
  async constructItem (type: string, itemId: string, readable: NodeJS.ReadableStream) {
    log('construct', { type, itemId });
    const model = this._modelFactory.createModel(type, itemId, readable, this._createWriteStream(itemId));
    assert(model);

    const item = new Item(itemId, model);

    assert(!this._items.has(itemId));
    this._items.set(itemId, item);

    log('Created:', this._pendingItems.get(itemId));

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
 * Reads party feeds and routes to items demuxer.
 */
// TODO(burdon): Convert to function that returns a stream.
export class PartyMuxer {
  private _allowedKeys: Set<string>;

  private _output: Readable;

  constructor (
    private readonly _feedStore: FeedStore,
    initialFeeds: string[]
  ) {
    this._allowedKeys = new Set(initialFeeds);

    // TODO(burdon): Hack.
    this._output = new Readable({ objectMode: true, read () { } });
  }

  // TODO(marik-d): Add logic to stop the processing.
  async run () {
    // NOTE: The iterator may halt if there are gaps in the replicated feeds (according to the timestamps).
    // In this case it would wait until a replication event notifies another feed has been added to the replication set.
    const iterator = await FeedStoreIterator.create(this._feedStore,
      async feedKey => this._allowedKeys.has(keyToString(feedKey))
    );

    for await (const { data: { message } } of iterator) {
      log('Muxer:', JSON.stringify(message, undefined, 2));

      switch (message.__type_url) {
        //
        // HALO messages.
        //
        case 'dxos.echo.testing.Admit': {
          assumeType<dxos.echo.testing.IAdmit>(message);
          assert(message.feedKey);

          this._allowedKeys.add(message.feedKey);
          break;
        }

        //
        // ECHO messages.
        //
        default: {
          assumeType<dxos.echo.testing.IItemEnvelope>(message);
          assert(message.itemId);

          // TODO(burdon): Order by timestamp.
          this._output.push({ data: { message } });

          // TODO(marik-d): Figure out backpressure https://nodejs.org/api/stream.html#stream_readable_push_chunk_encoding
          // if(!this._output.push({ data: { message } })) {
          //   await new Promise(resolve => { this._output.once('drain', resolve )})
          // }
        }
      }
    }
  }

  get output () { return this._output; }
}

/**
 * Reads party stream and routes to associate item stream.
 */
export const createItemDemuxer = (itemManager: ItemManager) => {
  // Map of Item-specific streams.
  // TODO(burdon): Abstract class?
  const streams = new LazyMap<ItemID, Readable>(() => new Readable({
    objectMode: true,
    read () {}
  }));

  // TODO(burdon): Could this implement some "back-pressure" (hints) to the PartyProcessor?
  // TODO(marik_d): Replace with Writable.
  return new Transform({
    objectMode: true,
    transform: async ({ data: { message } }, _, callback) => {
      log('Demuxer:', JSON.stringify(message, undefined, 2));
      assertAnyType<dxos.echo.testing.IItemEnvelope>(message, 'dxos.echo.testing.ItemEnvelope');

      const { itemId, payload } = message;
      assert(payload);
      assert(itemId);

      /* eslint-disable camelcase */
      const { __type_url } = payload as any;
      assert(__type_url);

      switch (__type_url) {
        case 'dxos.echo.testing.ItemGenesis': {
          assumeType<dxos.echo.testing.IItemGenesis>(payload);
          assert(payload.model);

          log(`Item Genesis: ${itemId}`);
          const stream = streams.getOrInit(itemId);
          await itemManager.constructItem(payload.model, itemId, stream);
          break;
        }

        case 'dxos.echo.testing.ItemMutation': {
          assumeType<dxos.echo.testing.IItemMutation>(payload);
          assert(payload);

          const stream = streams.getOrInit(itemId);
          // Remove ItemEnvelope
          stream.push({ data: { message: payload } });
          break;
        }

        default:
          throw new Error(`Unexpected type: ${__type_url}`);
      }

      callback();
    }
  });
};
