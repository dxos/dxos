//
// Copyright 2020 DxOS.org
//

import assert from 'assert';

import { useObjectMutator } from '@dxos/gem-core';

/**
 * @param data
 */
export const useModel = (data) => {
  const [objects,, getObjects, updateObjects] = useObjectMutator(data);

  // TODO(burdon): Async update (keep separate from ECHO model).
  // I.e., don't mutate to disk until stopped editing (don't append message while dragging).
  const model = {

    // TODO(burdon): Multiple
    appendObject: (object) => {
      updateObjects({ $push: [object] });
    },

    // TODO(burdon): Multiple
    updateObject: (id, properties) => {
      const objects = getObjects();
      const idx = objects.findIndex(object => object.id === id);
      const object = objects[idx];
      assert(object, `Invalid object: ${id}`);

      updateObjects({
        $splice: [[idx, 1, { ...object, ...properties }]]
      });
    },

    // TODO(burdon): Multiple
    removeObject: (id) => {
      const idx = objects.findIndex(object => object.id === id);
      assert(idx !== -1);
      updateObjects({ $splice: [[idx, 1]] });
    }
  };

  return [objects, model];
};
