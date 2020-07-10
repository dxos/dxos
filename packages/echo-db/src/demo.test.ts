//
// Copyright 2020 DXOS.org
//

// TODO(burdon): Import IDEA settings from mbp.

import ram from 'random-access-memory';

import { FeedStore } from '@dxos/feed-store';

import { ObjectStore, fromObject } from './object-store';

// TODO(burdon): Deprecate FeedStore.create async constructor, discoveryKey, etc.
// TODO(burdon): Item streams
// TODO(burdon): Protobuf, encoding.

class ObjectModel {

  _store = new ObjectStore();
}

class ModelFactory {

  // TODO(burdon): Shim?
  _feedStore: any;

  constructor(feedStore: any) {
    this._feedStore = feedStore;
  }

  createModel() {
    const model = new ObjectModel();
    return model;
  }
}

test('model', async done => {
  const feedStore = new FeedStore(ram);
  await feedStore.open();

  // TODO(burdon): Pass write stream to modelfactory?
  const feed = await feedStore.openFeed('test');

  // const modelFactory = new ModelFactory(feedStore);
  // const model = modelFactory.createModel();

  // TODO(burdon): Indexer should consume feed? (Manage live collection of all models?)
  const stream = feedStore.createReadStream({ live: true });
  stream.on('data', (data: any) => {
    done();
  });

  // TODO(burdon): Use model to write.
  feed.append(JSON.stringify(fromObject({ id: 'object-1', properties: { foo: 100 } })));
  feed.append(JSON.stringify(fromObject({ id: 'object-1', properties: { bar: 200 } })));

  // TODO(burdon): Open stream and replay?
});
