//
// Copyright 2019 Wireline, Inc.
//

import protobuf from 'protocol-buffers';
import uuid from 'uuid/v4';

import { MutationProtoUtil, KeyValueProtoUtil, ObjectModel } from '.';

import DataProtoDefs from './data.proto';

// TODO(burdon): Use protobuf defs.
test('Protobuf', () => {

  /**
   * @type DataProto
   * @property Value
   */
  const DataProto = protobuf(DataProtoDefs);

  expect(DataProto.Value.decode(DataProto.Value.encode({ isNull: true }))).toEqual({ isNull: true });
});

test('Mutations', () => {
  const objectId = ObjectModel.createId('test');

  const feed = {
    id: uuid(),
    messages: [
      MutationProtoUtil.createMessage(objectId, KeyValueProtoUtil.createMessage('title', 'Test-1')),
      MutationProtoUtil.createMessage(objectId, KeyValueProtoUtil.createMessage('priority', 1)),
      MutationProtoUtil.createMessage(objectId, KeyValueProtoUtil.createMessage('complete', false)),
    ]
  };

  const model = new ObjectModel().applyMutations(feed.messages);

  expect(model.getObjects('test')).toHaveLength(1);
  expect(model.getTypes()).toEqual(['test']);

  const object = model.objects.get(objectId);
  expect(object).toEqual({
    id: objectId,
    properties: {
      title: 'Test-1',
      complete: false,
      priority: 1
    }
  });

  {
    const messages = ObjectModel.fromObject(object);
    const model = new ObjectModel().applyMutations(messages);
    const clone = model.objects.get(object.id);
    expect(object).toEqual(clone);
  }
});

// TODO(burdon): Test with Framework (Gravity/wireline-core)?
// TODO(burdon): Describe consistency constraints (e.g., each Object is independent; mutation references previous).
test('Merge feeds', () => {
  const obj = { x: ObjectModel.createId('test'), y: ObjectModel.createId('test') };
  const ref = {};

  const feed1 = {
    id: 'feed-1',
    messages: [
      (ref.a = MutationProtoUtil.createMessage(obj.x, KeyValueProtoUtil.createMessage('title', 'Test-1'))),
      (ref.b = MutationProtoUtil.createMessage(obj.x, KeyValueProtoUtil.createMessage('priority', 1))),
      (ref.c = MutationProtoUtil.createMessage(obj.x, KeyValueProtoUtil.createMessage('complete', false))),
    ]
  };

  const feed2 = {
    id: 'feed-2',
    messages: [
      (ref.d = MutationProtoUtil.createMessage(obj.y, KeyValueProtoUtil.createMessage('title', 'Test-2'))),
      (ref.e = MutationProtoUtil.createMessage(obj.x, KeyValueProtoUtil.createMessage('priority', 3), { depends: ref.b.id })),
      (ref.f = MutationProtoUtil.createMessage(obj.y, KeyValueProtoUtil.createMessage('complete', true))),
    ]
  };

  const feed3 = {
    id: 'feed-3',
    messages: [
      (ref.g = MutationProtoUtil.createMessage(obj.y, KeyValueProtoUtil.createMessage('complete', false), { depends: ref.f.id })),
      (ref.h = MutationProtoUtil.createMessage(obj.x, KeyValueProtoUtil.createMessage('priority', 2), { depends: ref.b.id })),
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
      const object = model.objects.get(obj.x);
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
      const object = model.objects.get(obj.y);
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
  test(ObjectModel.mergeFeeds([feed1, feed2, feed3]));
  test(ObjectModel.mergeFeeds([feed3, feed2, feed1]));
  test(ObjectModel.mergeFeeds([feed2, feed3, feed1]));
});
