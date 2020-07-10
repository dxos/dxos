//
// Copyright 2020 DXOS.org
//

import { KeyValueUtil } from './mutation';
import { ObjectStore, fromObject, fromObjects } from './object-store';
import { createObjectId } from './util';

test('Create mutations from object', () => {
  const mutations = fromObjects([
    {
      id: createObjectId('test'),
      properties: {
        name: 'DXOS'
      }
    }
  ]);

  expect(mutations).toHaveLength(1);
});

test('Basic mutation', () => {
  const objectId = createObjectId('test');

  const mutations = [
    {
      objectId,
      mutations: [
        {
          key: 'title',
          value: {
            string: 'DXOS'
          }
        }
      ]
    }
  ];

  const objectStore = new ObjectStore();
  objectStore.applyMutations(mutations);

  const object = objectStore.getObjectById(objectId);
  expect(object).toBeTruthy();
  expect(object.properties.title).toBe('DXOS');
});

test('Sequence of mutations', () => {
  const objectId = createObjectId('test');

  const mutations = [
    {
      objectId,
      mutations: [
        KeyValueUtil.createMessage('title', 'Test-1'),
        KeyValueUtil.createMessage('priority', 1),
        KeyValueUtil.createMessage('complete', false)
      ]
    }
  ];

  const objectStore = new ObjectStore();
  objectStore.applyMutations(mutations);

  expect(objectStore.getObjectsByType('test')).toHaveLength(1);
  expect(objectStore.getTypes()).toEqual(['test']);

  const object = objectStore.getObjectById(objectId);
  expect(object).toEqual({
    id: objectId,
    properties: {
      title: 'Test-1',
      complete: false,
      priority: 1
    }
  });

  {
    const mutation = fromObject(object);
    const objectStore = new ObjectStore();
    objectStore.applyMutation(mutation);
    const clone = objectStore.getObjectById(object.id);
    expect(object).toEqual(clone);
  }
});
