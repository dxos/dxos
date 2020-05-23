//
// Copyright 2020 DxOS
//

import EventEmitter from 'events';

import { MutationUtil } from './mutation';
import { parseId } from './util';

/**
 * Simple Object Datastore composed from log mutations.
 */
// TODO(burdon): Rename store?
export class ObjectModel extends EventEmitter {
  // Objects indexed by ID.
  _objectById = new Map();

  /**
   * Returns an array of object types.
   * @returns {string[]}
   */
  getTypes () {
    return Array.from(
      Array.from(this._objectById.values()).reduce((set, { id }) => set.add(parseId(id).type), new Set())
    );
  }

  /**
   * Returns an array of objects by type in an unspecified order.
   * @returns {Object[]}
   */
  // TODO(burdon): orderBy?
  getObjectsByType (type) {
    return Array.from(this._objectById.values()).filter(({ id }) => parseId(id).type === type);
  }

  /**
   * Returns the object with the given ID (or undefined).
   * @param id
   * @returns {Object}
   */
  getObjectById (id) {
    return this._objectById.get(id);
  }

  /**
   * Resets the entire model.
   * @returns {ObjectModel}
   */
  reset () {
    this._objectById.clear();
    return this;
  }

  /**
   * Applies an array of mutations, updating the state.
   * @param mutations
   * @returns {ObjectModel}
   */
  // TODO(burdon): Integrate with CRDT.
  applyMutations (mutations = []) {
    mutations.forEach((message) => {
      const { objectId, deleted } = message;

      if (objectId) {
        if (deleted) {
          this._objectById.delete(objectId);
        } else {
          let object = this._objectById.get(objectId);
          if (!object) {
            object = { id: objectId, properties: {} };
            this._objectById.set(objectId, object);
          }

          MutationUtil.applyMutation(object.properties, message);
        }
      }
    });

    return this;
  }
}
