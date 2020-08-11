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
import { LogicalClockStamp } from './logical-clock-stamp';

const log = debug('dxos:echo:database');

export type FeedKey = Uint8Array;
export type ItemID = string;

/**
 * Returns a stream that appends messages directly to a hypercore feed.
 * @param feed
 * @returns {NodeJS.WritableStream}
 */
export const createWritableFeedStream = (feed: Feed) => new Writable({
  objectMode: true,
  write (message, _, callback) {
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
    private _itemId: ItemID,
    private _readable: NodeJS.ReadableStream,
    private _writable?: NodeJS.WritableStream // TODO(burdon): Read-only?
  ) {
    super();
    assert(this._type);
    assert(this._itemId);

    this._readable.pipe(new Transform({
      objectMode: true,
      transform: async (message, _, callback) => {
        // log('Model.read', message);
        await this.processMessage(message);

        // TODO(burdon): Emit immutable value (or just ID).
        this.emit('update', this);
        callback();
      }
    }));
  }

  get itemId () {
    return this._itemId;
  }

  get readOnly () {
    return this._writable !== undefined;
  }

  /**
   * Wraps the message within an ItemEnvelope then writes to the output stream.
   * @param message
   */
  async write (message: any) {
    assert(this._writable);
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
  private _models = new Map<string, Constructor<Model>>();

  registerModel (type: string, modelConstructor: Constructor<Model>) {
    assert(type);
    assert(modelConstructor);
    this._models.set(type, modelConstructor);
    return this;
  }

  // TODO(burdon): Require version.
  createModel (type: string, itemId: ItemID, readable: NodeJS.ReadableStream, writable?: NodeJS.WritableStream) {
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
export class Item extends EventEmitter {
  constructor (
    private _itemId: ItemID,
    private _type: string,
    private _model: Model
  ) {
    super();
    assert(this._itemId);
    assert(this._type);
    assert(this._model);
  }

  get id () {
    return this._itemId;
  }

  get type () {
    return this._type;
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

  private _createWriteStream (itemId: ItemID): NodeJS.WritableStream {
    const transform = new Transform({
      objectMode: true,
      write (message, _, callback) {
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

    // TODO(burdon): Don't bury pipe inside methods that create streams (side effects).
    transform.pipe(this._writable);
    return transform;
  }

  /**
   * Creates an item and writes the genesis message.
   * @param itemType item type
   * @param modelType model type
   */
  async createItem (itemType: string, modelType: string): Promise<Item> {
    assert(itemType);
    assert(modelType);

    // Pending until constructed (after genesis block is read from stream).
    const [waitForCreation, callback] = trigger();

    const itemId = createId();
    this._pendingItems.set(itemId, callback);

    // Write Item Genesis block.
    // TODO(burdon): Write directly to the writable stream (not wrapper)?
    log('Creating Genesis:', itemId);
    const writable = this._createWriteStream(itemId);
    await pify(writable.write.bind(writable))({
      __type_url: 'dxos.echo.testing.ItemGenesis',
      type: itemType,
      model: modelType
    });

    // Unlocked by construct.
    log('Waiting for item...');
    return await waitForCreation();
  }

  /**
   * Constructs an item with the appropriate model.
   * @param itemId
   * @param itemType
   * @param modelType
   * @param readable
   */
  async constructItem (itemId: ItemID, itemType: string, modelType: string, readable: NodeJS.ReadableStream) {
    assert(itemId);
    assert(itemType);
    assert(modelType);
    assert(readable);

    // Create model.
    // TODO(burdon): Skip genesis message (and subsequent messages) if unknown model.
    const writable = this._createWriteStream(itemId);
    const model = this._modelFactory.createModel(modelType, itemId, readable, writable);
    assert(model, `Invalid model: ${modelType}`);

    // Create item.
    const item = new Item(itemId, modelType, model);
    assert(!this._items.has(itemId));
    this._items.set(itemId, item);

    // Item udpated.
    model.on('update', () => {
      item.emit('update', item);
      this.emit('update', item);
    });

    // Notify pending creates.
    this._pendingItems.get(itemId)?.(item);
    this.emit('create', item);
    return item;
  }

  /**
   * Retrieves a data item from the index.
   * @param itemId
   */
  getItem (itemId: ItemID) {
    return this._items.get(itemId);
  }

  /**
   * Return matching items.
   * @param [filter]
   */
  getItems (filter: any = {}) {
    const { type } = filter;
    return Array.from(this._items.values()).filter(item => !type || item.type === type);
  }
}

/**
 * Reads party feeds and routes to items demuxer.
 * @param feedStore
 * @param [initialFeeds]
 * @param [initialAnchor] TODO(burdon): Emit event when anchor point reached?
 */
export const createPartyMuxer = (
  feedStore: FeedStore, initialFeeds: FeedKey[], initialAnchor?: dxos.echo.testing.IVectorTimestamp
) => {
  // TODO(burdon): Is this the correct way to create a stream?
  const outputStream = new Readable({ objectMode: true, read () {} });

  // Configure iterator with dynamic set of admitted feeds.
  const allowedFeeds: Set<string> = new Set(initialFeeds.map(feedKey => keyToString(feedKey)));

  // TODO(burdon): Explain control.
  setImmediate(async () => {
    const iterator = await FeedStoreIterator.create(feedStore,
      async feedKey => allowedFeeds.has(keyToString(feedKey))
    );

    // NOTE: The iterator may halt if there are gaps in the replicated feeds (according to the timestamps).
    // In this case it would wait until a replication event notifies another feed has been added to the replication set.
    for await (const { data: { message }, key, seq } of iterator) {
      log('Muxer:', JSON.stringify(message));

      switch (message.__type_url) {
        //
        // HALO messages.
        //
        case 'dxos.echo.testing.Admit': {
          assumeType<dxos.echo.testing.IAdmit>(message);
          assert(message.feedKey);

          allowedFeeds.add(keyToString(message.feedKey));
          break;
        }

        //
        // ECHO messages.
        //
        default: {
          assumeType<dxos.echo.testing.IItemEnvelope>(message);
          assert(message.itemId);

          // TODO(burdon): Order by timestamp.
          outputStream.push({ data: { message }, key, seq });

          // TODO(marik-d): Backpressure: https://nodejs.org/api/stream.html#stream_readable_push_chunk_encoding
          // if (!this._output.push({ data: { message } })) {
          //   await new Promise(resolve => { this._output.once('drain', resolve )});
          // }
        }
      }
    }
  });

  return outputStream;
};

/**
 * Reads party stream and routes to associate item stream.
 * @param itemManager
 */
export const createItemDemuxer = (itemManager: ItemManager) => {
  // Map of Item-specific streams.
  const itemStreams = new LazyMap<ItemID, Readable>(() => new Readable({ objectMode: true, read () {} }));

  // TODO(burdon): Should this implement some "back-pressure" (hints) to the PartyProcessor?
  return new Writable({
    objectMode: true,
    write: async (chunk, _, callback) => {
      const { data: { message } } = chunk;
      log('Demuxer:', JSON.stringify(chunk, undefined, 2));
      assertAnyType<dxos.echo.testing.IItemEnvelope>(message, 'dxos.echo.testing.ItemEnvelope');
      const { itemId, payload } = message;
      assert(itemId);
      assert(payload);

      /* eslint-disable camelcase */
      const { __type_url } = payload as any;
      switch (__type_url) {
        //
        // Item genesis.
        //
        case 'dxos.echo.testing.ItemGenesis': {
          assumeType<dxos.echo.testing.IItemGenesis>(payload);
          assert(payload.type);
          assert(payload.model);

          const stream = itemStreams.getOrInit(itemId);
          const item = await itemManager.constructItem(itemId, payload.type, payload.model, stream);
          log(`Constructed Item: ${item.id}`);
          break;
        }

        //
        // Item mutation.
        //
        case 'dxos.echo.testing.ItemMutation': {
          assumeType<dxos.echo.testing.IItemMutation>(payload);
          assert(payload);

          const stream = itemStreams.getOrInit(itemId);
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

export const createTimestampTransform = (writeFeedKey: Buffer) => {
  let currentTimestamp = new LogicalClockStamp();

  const inboundTransform = new Transform({
    objectMode: true,
    transform (chunk, encoding, callback) {
      const { message } = chunk.data;
      assertAnyType<dxos.echo.testing.IItemEnvelope>(message, 'dxos.echo.testing.ItemEnvelope');

      const timestamp = (message.timestamp ? LogicalClockStamp.decode(message.timestamp) : LogicalClockStamp.zero()).withFeed(chunk.key, chunk.seq);
      currentTimestamp = LogicalClockStamp.max(currentTimestamp, timestamp);
      log(`current timestamp = ${currentTimestamp.log()}`);
      callback(null, chunk);
    }
  });

  const outboundTransform = new Transform({
    objectMode: true,
    transform (chunk, encoding, callback) {
      const { message } = chunk;
      assertAnyType<dxos.echo.testing.IItemEnvelope>(message, 'dxos.echo.testing.ItemEnvelope');
      message.timestamp = LogicalClockStamp.encode(currentTimestamp.withoutFeed(writeFeedKey));
      callback(null, chunk);
    }
  });

  return [inboundTransform, outboundTransform] as const;
};
