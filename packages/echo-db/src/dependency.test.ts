//
// Copyright 2020 DxOS.org
//

import { Feed as BaseFeed, mergeFeeds } from './dependency';
import { KeyValueUtil } from './mutation';
import { ObjectStore } from './object-store';
import { dxos } from './proto/gen/echo';
import { createObjectId } from './util';

import IObjectMutation = dxos.echo.IObjectMutation;

test('Merge feeds', () => {
  const obj = { x: { id: createObjectId('test') }, y: { id: createObjectId('test') } };

  // TODO(burdon): Test if blocked or cycles.
  // TODO(burdon): Generate mutations by actually mutation different object stores?
  // TODO(burdon): Demonstrate conflicts.

  type Feed = BaseFeed<IObjectMutation>;

  const feed1: Feed = {
    id: '1',
    messages: [
      {
        id: '1',
        objectId: obj.x.id,
        mutations: [KeyValueUtil.createMessage('title', 'Test-1')]
      },
      {
        id: '2',
        objectId: obj.x.id,
        mutations: [KeyValueUtil.createMessage('priority', 1)]
      },
      {
        id: '3',
        objectId: obj.x.id,
        mutations: [KeyValueUtil.createMessage('complete', false)]
      }
    ]
  };

  const feed2: Feed = {
    id: '2',
    messages: [
      {
        id: '4',
        objectId: obj.y.id,
        mutations: [KeyValueUtil.createMessage('title', 'Test-2')]
      },
      {
        id: '5',
        dependency: '2',
        objectId: obj.x.id,
        mutations: [KeyValueUtil.createMessage('priority', 3)]
      },
      {
        id: '6',
        dependency: '4',
        objectId: obj.y.id,
        mutations: [KeyValueUtil.createMessage('title', 'Test-2 Modified')]
      }
    ]
  };

  const feed3: Feed = {
    id: '3',
    messages: [
      {
        id: '7',
        dependency: '6',
        objectId: obj.y.id,
        mutations: [KeyValueUtil.createMessage('complete', false)]
      },
      {
        id: '8',
        dependency: '2',
        objectId: obj.x.id,
        mutations: [KeyValueUtil.createMessage('priority', 2)]
      }
    ]
  };

  const runTest = (messages: any) => {
    expect(messages).toHaveLength(feed1.messages.length + feed2.messages.length + feed3.messages.length);

    const model = new ObjectStore().applyMutations(messages);

    {
      const object = model.getObjectById(obj.x.id);
      expect(object).toEqual({
        id: object.id,
        properties: {
          title: 'Test-1',
          complete: false,

          // feed-3 is processed after feed-2 due to sorted log IDs.
          priority: 2
        }
      });
    }

    {
      const object = model.getObjectById(obj.y.id);
      expect(object).toEqual({
        id: object.id,
        properties: {
          title: 'Test-2 Modified',
          complete: false
        }
      });
    }
  };

  // Test in any order.
  runTest(mergeFeeds([feed1, feed2, feed3]));
  runTest(mergeFeeds([feed3, feed2, feed1]));
  runTest(mergeFeeds([feed2, feed3, feed1]));
});
