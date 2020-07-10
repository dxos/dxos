//
// Copyright 2020 DXOS.org
//

// TODO(burdon): Move to experimental package?

import debug from 'debug';
import ram from 'random-access-memory';

import { sleep } from '@dxos/async';
import { createId } from '@dxos/crypto';
import { FeedStore } from '@dxos/feed-store';

import { ObjectStore, fromObject } from '../object-store';
import { createObjectId } from '../util';

const log = debug('dxos:echo:experimental');
debug.enable('dxos:*');

interface IMessage {}

interface IBlock {
  data: string;
}

interface IFeed {
  append(data: string): void;
}

interface IReadStream {
  on (event: string, callback: object): void;
}

interface IFeedStore {
  createReadStream(config: object): IReadStream;
}

interface IModel {
  // TODO(burdon): Stream?
  processMessages (messages: object[]): Promise<void>;
}

/**
 *
 */
class ObjectModel implements IModel {
  _appendMessages: any;

  _store = new ObjectStore();

  // TODO(burdon): Stream?
  constructor (appendMessages: any) {
    this._appendMessages = appendMessages;
  }

  getObjectsByType (type: string) {
    return this._store.getObjectsByType(type);
  }

  createObject (type: string, properties: object) {
    const id = createObjectId(type);
    const mutations = fromObject({ id, properties });

    // TODO(burdon): Stream?
    this._appendMessages([{
      __type_url: type,
      ...mutations
    }]);

    return id;
  }

  async processMessages (messages: object[]) {
    this._store.applyMutations(messages);
  }
}

/**
 *
 */
class Item {
  _id: string;
  _model: IModel;

  constructor (id: string, model: IModel) {
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
  // TODO(burdon): Fix lint.
  _feedStore: IFeedStore;
  _feed: IFeed;
  _itemsById = new Map();

  constructor (feedStore: IFeedStore, feed: IFeed) {
    this._feedStore = feedStore;
    this._feed = feed;
  }

  async initialize () {
    const stream = this._feedStore.createReadStream({ live: true });
    stream.on('data', (block: IBlock) => {
      // TODO(burdon): Codec decode.
      const { data } = block;
      const { itemId, message } = JSON.parse(data);

      // TODO(burdon): Create item if it doesn't exist (from spec).
      const item = this._itemsById.get(itemId);

      item.model.processMessages([message]);
    });

    return this;
  }

  async createItem (): Promise<Item> {
    const itemId = createId();

    // TODO(burdon): Generalize model and type.
    const model = new ObjectModel((messages: IMessage[]) => {
      // TODO(burdon): Codec encode.
      messages.forEach((message: IMessage) => this._feed.append(JSON.stringify({ itemId, message })));
    });

    // TODO(burdon): Encode item metadata (e.g., model spec).
    const item = new Item(itemId, model);
    this._itemsById.set(itemId, item);
    return item;
  }

  // TODO(burdon): Get stream of items?
  async getItem (itemId: string): Promise<Item> {
    return this._itemsById.get(itemId);
  }
}

test('basic items', async () => {
  const feedStore = new FeedStore(ram, { feedOptions: { valueEncoding: 'utf-8' } });
  await feedStore.open();

  const feed = await feedStore.openFeed('node-1');
  const database = new Database(feedStore, feed);
  await database.initialize();

  let id;
  {
    const item = await database.createItem();
    await (item.model as ObjectModel).createObject('test', { foo: 100 });
    id = item.id;
  }

  {
    // TODO(burdon): Sleep or get item stream?
    await sleep(1);

    const item = await database.getItem(id);
    const objects = await (item.model as ObjectModel).getObjectsByType('test');
    log(objects);

    expect(objects).toHaveLength(1);
  }
});
