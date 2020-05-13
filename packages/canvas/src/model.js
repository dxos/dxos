//
// Copyright 2020 DxOS.org
//

import assert from 'assert';
import debug from 'debug';
import faker from 'faker';
import isEqual from 'lodash.isequal';

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

  const model = {

    /**
     *
     * @param {Object} properties
     */
    createObject: (properties) => {
      const object = createObject(properties);

      log('created', object);
      updateObjects({ $push: [object] });
    },

    /**
     *
     * @param {string} id
     * @param {Object} properties
     */
    updateObject: (id, properties) => {
      const objects = getObjects();
      const idx = objects.findIndex(object => object.id === id);
      const object = objects[idx];
      const { properties: currentProperties, ...rest } = object;
      assert(id, `Invalid object: ${id}`);
      const updated = { ...rest, properties: { ...currentProperties, ...properties } };

      // TODO(burdon): Check before calling.
      if (isEqual(object, updated)) {
        return;
      }

      log('updated', updated);
      updateObjects({
        $splice: [[idx, 1, updated]]
      });
    },

    /**
     *
     * @param {string} id
     */
    removeObject: (id) => {
      const idx = objects.findIndex(object => object.id === id);
      assert(idx !== -1);

      log('removed', id);
      updateObjects({ $splice: [[idx, 1]] });
    }
  };

  return [objects, model];
};
