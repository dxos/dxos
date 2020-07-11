//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';
import tempy from 'tempy';

import { sleep } from '@dxos/async';
import { createId } from '@dxos/crypto';
import { FeedStore } from '@dxos/feed-store';

import { ObjectStore, fromObject } from '../object-store';
import { createObjectId } from '../util';

const log = debug('dxos:echo:experimental');
debug.enable('dxos:*');

// TODO(burdon): Protobuf/codec.

type ID = string;
type Class = string;

// TODO(burdon): Define top-level protobuf for echo (separate from HALO).
interface IMessage {
  itemId: ID;
  message: object;
}

interface IBlock {
  data: string;
}

interface IFeed {
  append(data: string): void;
}

interface IReadableStream {
  on (event: string, callback: object): void;
}

interface IFeedStore {
  createReadStream(config: object): IReadableStream;
}

interface IModel {
  // TODO(burdon): Stream?
  processMessages (messages: object[]): Promise<void>;
}

/**
 *
 */
class ObjectModel implements IModel {
  static ID = 'wrn://dxos/model/object';

  _appendMessages?: Function;
  _store = new ObjectStore();

  // TODO(burdon): Stream?
  initialize (appendMessages: Function) {
    this._appendMessages = appendMessages;
    return this;
  }

  getObjectsByType (type: string) {
    return this._store.getObjectsByType(type);
  }

  async createObject (type: string, properties: object) {
    const id = createObjectId(type);
    const mutations = fromObject({ id, properties });

    // TODO(burdon): Stream?
    assert(this._appendMessages);
    await this._appendMessages([{
      __type_url: type,
      ...mutations
    }]);

    return id;
  }

  async processMessages (messages: object[]) {
    this._store.applyMutations(messages);
  }
}

class ModelFactory {
  _modelById = new Map();

  addModel (modelId: ID, constructor: Function) {
    this._modelById.set(modelId, constructor);
    return this;
  }

  createModel (modelId: ID) {
    return this._modelById.get(modelId)();
  }
}

/**
 *
 */
class Item {
  _id: ID;
  _model: IModel;

  constructor (id: ID, model: IModel) {
    this._id = id;
    this._model = model;
  }

  get id () {
    return this._id;
  }

  get model () {
    return this._model;
  }
}

/**
 *
 */
class Database {
  _feedStore: IFeedStore;
  _feed: IFeed;
  _modelFactory: ModelFactory;
  _itemsById = new Map();

  constructor (feedStore: IFeedStore, feed: IFeed, modelFactory: ModelFactory) {
    this._feedStore = feedStore;
    this._feed = feed;
    this._modelFactory = modelFactory;
  }

  async initialize () {
    const stream = this._feedStore.createReadStream({ live: true });

    log('Streaming...');
    stream.on('data', async (block: IBlock) => {
      // TODO(burdon): Codec decode.
      const { data } = block;
      const { itemId, message } = JSON.parse(data) as IMessage;

      log(`Message [item=${itemId}]: ${JSON.stringify(message)}`);

      // TODO(burdon): Create item if it doesn't exist (from spec).
      let item = this._itemsById.get(itemId);
      if (!item) {
        item = await this.createItem(ObjectModel.ID, itemId);
      }

      await item.model.processMessages([message]);
    });

    return this;
  }

  async close () {
    this._itemsById.clear();
  }

  // TODO(burdon): Nested from root.
  async createItem (modelId: ID, itemId: ID = createId()): Promise<Item> {
    const model = this._modelFactory.createModel(modelId);

    // TODO(burdon): Generalize model and type.
    model.initialize(async (messages: object[]) => {
      // TODO(burdon): Codec encode.
      await messages.forEach((message: object) => this._feed.append(JSON.stringify({ itemId, message })));
    });

    // TODO(burdon): Encode item metadata (e.g., model spec).
    const item = new Item(itemId, model);
    this._itemsById.set(itemId, item);
    return item;
  }

  // TODO(burdon): Read-only until item has caught up.
  async getItem (itemId: ID): Promise<Item> {
    // TODO(burdon): Create (from metadata) if doesn't exist (mutex?)
    return this._itemsById.get(itemId);
  }
}

test('basic items', async () => {
  const modelFactory = new ModelFactory().addModel(ObjectModel.ID, () => new ObjectModel());

  // TODO(burdon): ram gets reset after FeedStore closed?
  const directory = tempy.directory();
  const feedStore = new FeedStore(directory, { feedOptions: { valueEncoding: 'utf-8' } });

  let itemId: ID;
  {
    await feedStore.open();
    const feed = await feedStore.openFeed('node-1');

    const database = new Database(feedStore, feed, modelFactory);
    await database.initialize();

    // Create item.
    {
      const item = await database.createItem(ObjectModel.ID);
      await (item.model as ObjectModel).createObject('test', { foo: 100 });
      itemId = item.id;
    }

    // Open cached item.
    {
      // TODO(burdon): Sleep or wait for anchor?
      await sleep(5);

      const item = await database.getItem(itemId);
      const objects = await (item.model as ObjectModel).getObjectsByType('test');

      expect(objects).toHaveLength(1);
      expect(objects[0].properties.foo).toBe(100);
    }

    await feed.close();
    await feedStore.close();
    await database.close();
  }

  // Open the database from cold and process existing messages.
  {
    await feedStore.open();
    const feed = await feedStore.openFeed('node-1');

    const database = new Database(feedStore, feed, modelFactory);
    await database.initialize();

    // TODO(burdon): Sleep or wait for anchor?
    await sleep(5);

    const item = await database.getItem(itemId);
    const objects = await (item.model as ObjectModel).getObjectsByType('test');

    expect(objects).toHaveLength(1);
    expect(objects[0].properties.foo).toBe(100);

    await feed.close();
    await feedStore.close();
    await database.close();
  }
});
