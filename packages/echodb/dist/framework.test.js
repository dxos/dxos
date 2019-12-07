//
// Copyright 2019 Wireline, Inc.
//

import crypto from 'hypercore-crypto';

import swarm from '@wirelineio/discovery-swarm-memory';
import { Framework } from '@wirelineio/framework';

import { ObjectModel } from './object';
import { LogViewAdapter } from './view';
import { MutationProtoUtil, KeyValueProtoUtil } from './mutation';

const createFramework = async (partyKey, name) => {
  return new Framework({
    keys: crypto.keyPair(),
    swarm,

    // TODO(burdon): Remove.
    partyKey,
    name,
  }).initialize();
};

// TODO(burdon): Is there something standard that does this?
const waitForUpdate = async (model, count = 1) => {
  return new Promise((resolve) => {
    const listener = () => {
      if (--count <= 0) {
        model.removeListener('update', listener);
        resolve();
      }
    };

    model.on('update', listener);
  });
};

test('mutations', async () => {
  const partyKey = crypto.randomBytes(32);
  const bucketId = 'bucket-1';
  const objectType = 'card';

  // TODO(burdon): Support multiple parties (remove from constructor).
  const f1 = await createFramework(partyKey, 'peer-1');
  const f2 = await createFramework(partyKey, 'peer-2');

  // f1.connect(partyKey);
  // f2.connect(partyKey);

  // TODO(burdon): Move into framework API (remove access to kappa).
  const view1 = await LogViewAdapter.createView(f1, bucketId);
  const view2 = await LogViewAdapter.createView(f2, bucketId);

  const model1 = new ObjectModel().connect(view1);
  const model2 = new ObjectModel().connect(view2);

  expect(model1.getObjects(objectType)).toHaveLength(0);
  expect(model2.getObjects(objectType)).toHaveLength(0);

  const objects = [
    {
      id: ObjectModel.createId(objectType),
      properties: {
        title: 'Card 1'
      }
    },
    {
      id: ObjectModel.createId(objectType),
      properties: {
        title: 'Card 2',
        priority: 2
      }
    },
    {
      id: ObjectModel.createId(objectType),
      properties: {
        title: 'Card 3',
        priority: 1
      }
    }
  ];

  // TODO(burdon): Integrate Text CRDT API? i.e., composite models.

  // Create objects.
  {
    const mutations = ObjectModel.fromObjects(objects);
    await model1.commitMutations(mutations);

    await waitForUpdate(model2);
    expect(model2.getObjects(objectType)).toHaveLength(objects.length);
    for (const object of objects) {
      expect(model2.objects.get(object.id)).toEqual(object);
    }
  }

  // Update object.
  {
    expect(model1.objects.get(objects[1].id).properties.priority).toEqual(2);

    const mutations = [
      MutationProtoUtil.createMessage(objects[1].id, KeyValueProtoUtil.createMessage('priority', 3))
    ];
    await model2.commitMutations(mutations);

    await waitForUpdate(model1);
    expect(model1.objects.get(objects[1].id).properties.priority).toEqual(3);
  }

  // Delete object.
  {
    const mutations = [
      MutationProtoUtil.createMessage(objects[1].id, null, { deleted: true })
    ];
    await model2.commitMutations(mutations);

    await waitForUpdate(model1);
    expect(model2.getObjects(objectType)).toHaveLength(objects.length - 1);
  }

  // TODO(burdon): Conflicts (e.g., update after deletion).
});
