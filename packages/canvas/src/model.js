//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';
import faker from 'faker';

import { useObjectMutator } from '@dxos/gem-core';

const log = debug('gem:canvas:model');

// TODO(burdon): Only update records on end of drag (e.g., commit). Separate memory model and stored model?
// TODO(burdon): Support multiple objects.

/**
 * @param {Object} properties
 * @return {{ id:string , properties: Object }}
 */
const createObject = (properties) => ({
  id: faker.random.uuid(),
  properties,
});

/**
 * Canvas model.
 * @param {Object[]} data - Initial data set.
 */
export const useCanvasModel = (data = []) => {
  const [objects,, getObjects, updateObjects] = useObjectMutator(data.map(properties => createObject(properties)));

  let mutations = null;

  const model = {

    begin: () => {
      console.log('BEGIN');
      mutations = [];
      return this;
    },

    commit: () => {
      // TODO(burdon): Compress operations.
      console.log('COMMIT', mutations);
      mutations = null;
      return this;
    },

    /**
     * @param {Object} properties
     */
    createObject: (properties) => {
      if (mutations) {
        mutations.push({ action: 'create', properties });
      }

      const object = createObject(properties);

      log('created', object);
      updateObjects({ $push: [object] });
      return object.id;
    },

    /**
     * @param {string} id
     * @param {Object} properties
     */
    updateObject: (id, properties) => {
      if (mutations) {
        mutations.push({ action: 'update', id, properties });
      }

      const objects = getObjects();
      const idx = objects.findIndex(object => object.id === id);
      const object = objects[idx];
      const { properties: currentProperties, ...rest } = object;
      assert(id, `Invalid object: ${id}`);
      const updated = { ...rest, properties: { ...currentProperties, ...properties } };

      // TODO(burdon): Test before calling.
      // if (isEqual(object, updated)) {
      //   return;
      // }

      log('updated', updated);
      updateObjects({
        $splice: [[idx, 1, updated]]
      });
    },

    /**
     * @param {string} id
     */
    deleteObject: (id) => {
      if (mutations) {
        mutations.push({ action: 'delete', id });
      }

      const idx = objects.findIndex(object => object.id === id);
      assert(idx !== -1);

      log('deleted', id);
      updateObjects({ $splice: [[idx, 1]] });
    },
  };

  return [objects, model];
};
