//
// Copyright 2019 Wireline, Inc.
//

import uuid from 'uuid/v4';

// import { Codec } from '@dxos/codec-protobuf';

import { MutationUtil, KeyValueUtil } from './mutation';
import { ObjectModel } from './object';
import { createId, fromObject } from './util';

import { mergeFeeds } from './crdt';

// import DataProtoDefs from './data.proto';

// const codec = new Codec('.testing.Message')
//   .addJson(require('./data.json'))
//   .build();

// TODO(burdon): Use protobuf defs.
test('Protobuf', () => {
  // expect(DataProto.Value.decode(DataProto.Value.encode({ isNull: true }))).toEqual({ isNull: true });
});

test('Mutations', () => {
  const objectId = createId('test');

  const feed = {
    id: uuid(),
    messages: [
      MutationUtil.createMessage(objectId, KeyValueUtil.createMessage('title', 'Test-1')),
      MutationUtil.createMessage(objectId, KeyValueUtil.createMessage('priority', 1)),
      MutationUtil.createMessage(objectId, KeyValueUtil.createMessage('complete', false)),
    ]
  };

  const model = new ObjectModel().applyMutations(feed.messages);

  expect(model.getObjectsByType('test')).toHaveLength(1);
  expect(model.getTypes()).toEqual(['test']);

  const object = model.getObjectById(objectId);
  expect(object).toEqual({
    id: objectId,
    properties: {
      title: 'Test-1',
      complete: false,
      priority: 1
    }
  });

  {
    const messages = fromObject(object);
    const model = new ObjectModel().applyMutations(messages);
    const clone = model.getObjectById(object.id);
    expect(object).toEqual(clone);
  }
});

// TODO(burdon): Test with Framework (Gravity/wireline-core)?
// TODO(burdon): Describe consistency constraints (e.g., each Object is independent; mutation references previous).
test('Merge feeds', () => {
  const obj = { x: createId('test'), y: createId('test') };
  const ref = {};

  const feed1 = {
    id: 'feed-1',
    messages: [
      (ref.a = MutationUtil.createMessage(obj.x, KeyValueUtil.createMessage('title', 'Test-1'))),
      (ref.b = MutationUtil.createMessage(obj.x, KeyValueUtil.createMessage('priority', 1))),
      (ref.c = MutationUtil.createMessage(obj.x, KeyValueUtil.createMessage('complete', false))),
    ]
  };

  const feed2 = {
    id: 'feed-2',
    messages: [
      (ref.d = MutationUtil.createMessage(obj.y, KeyValueUtil.createMessage('title', 'Test-2'))),
      (ref.e = MutationUtil.createMessage(obj.x, KeyValueUtil.createMessage('priority', 3), { depends: ref.b.id })),
      (ref.f = MutationUtil.createMessage(obj.y, KeyValueUtil.createMessage('complete', true))),
    ]
  };

  const feed3 = {
    id: 'feed-3',
    messages: [
      (ref.g = MutationUtil.createMessage(obj.y, KeyValueUtil.createMessage('complete', false), { depends: ref.f.id })),
      (ref.h = MutationUtil.createMessage(obj.x, KeyValueUtil.createMessage('priority', 2), { depends: ref.b.id })),
    ]
  };

  // Dependencies.
  expect(ref.b.id).toEqual(ref.e.depends);
  expect(ref.b.id).toEqual(ref.h.depends);
  expect(ref.f.id).toEqual(ref.g.depends);

  const test = (messages) => {
    expect(messages).toHaveLength(feed1.messages.length + feed2.messages.length + feed3.messages.length);

    const model = new ObjectModel().applyMutations(messages);

    {
      const object = model.getObjectById(obj.x);
      expect(object).toEqual({
        id: object.id,
        properties: {
          title: 'Test-1',
          complete: false,                            // value overwrites previous due to dependency.
          priority: 2                                 // log-3 is processed after log-2 due to sorted log IDs.
        }
      });
    }

    {
      const object = model.getObjectById(obj.y);
      expect(object).toEqual({
        id: object.id,
        properties: {
          title: 'Test-2',
          complete: false
        }
      });
    }
  };

  // Test in any order.
  test(mergeFeeds([feed1, feed2, feed3]));
  test(mergeFeeds([feed3, feed2, feed1]));
  test(mergeFeeds([feed2, feed3, feed1]));
});
