//
// Copyright 2020 DxOS.org
//

import assert from 'assert';

import { useObjectMutator } from '@dxos/gem-core';

/**
 * Canvas model.
 * @param {Object[]} data - Initial data set.
 */
export const useCanvasModel = (data = []) => {
  const [objects,, getObjects, updateObjects] = useObjectMutator(data || []);

  // TODO(burdon): Create ECHO model (with async updates).
  // I.e., don't mutate to disk until stopped editing (don't append message while dragging).
  // TODO(burdon): Adapt methods to support multiple objects.

  const model = {

    /**
     *
     * @param {Object} object
     */
    appendObject: (object) => {
      assert(object && object.id);

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
      assert(object, `Invalid object: ${id}`);

      updateObjects({
        $splice: [[idx, 1, { ...object, ...properties }]]
      });
    },

    /**
     *
     * @param {string} id
     */
    removeObject: (id) => {
      const idx = objects.findIndex(object => object.id === id);
      assert(idx !== -1);

      updateObjects({ $splice: [[idx, 1]] });
    }
  };

  return [objects, model];
};
