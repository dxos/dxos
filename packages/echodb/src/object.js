//
// Copyright 2019 Wireline, Inc.
//

import { EventEmitter } from 'events';
import uuid from 'uuid/v4';

import { KeyValueUtil, MutationUtil } from './mutation';

/**
 * Simple Object Datastore composed from log mutations.
 */
export class ObjectModel extends EventEmitter {

  // TODO(burdon): Dependency Graph: https://www.npmjs.com/package/dependency-graph
  // TODO(burdon): Determine if model is before or after withLogView.

  /**
   * Crate unique ID string.
   * @param {string} type
   * @param {string} [id]
   * @return {string} ID
   */
  static createId = (type, id = undefined) => {
    console.assert(type);
    return `${type}/${id || uuid()}`;
  };

  /**
   * Parse ID string.
   * @param {string} id
   * @return {{id: *, type: *}}
   */
  static parseId = (id) => {
    const parts = id.split('/');
    console.assert(parts.length === 2 ? parts[0] : parts[1]);
    return { type: parts[0], id: parts[1] };
  };

  /**
   * Create a set mutation messages from a collection of objects.
   * @param objects
   * @return {[]}
   */
  static fromObjects(objects) {
    return objects.reduce((messages, object) => {
      return messages.concat(ObjectModel.fromObject(object));
    }, []);
  }

  static fromObject(object) {
    return Object.keys(object.properties || {}).map((property) => {
      return MutationUtil.createMessage(
        object.id, KeyValueUtil.createMessage(property, object.properties[property])
      );
    });
  }

  // Objects indexed by ID.
  _objectById = new Map();

  /**
   * @param {LogViewAdapter} view
   * @return {ObjectModel}
   */
  // TODO(burdon): Add disconnect.
  connect(view) {
    console.assert(view);
    this._view = view;

    view.on('update', (log) => {
      this.applyMutations(log);
      this.emit('update', this);
    });

    return this;
  }

  // TODO(burdon): Remove.
  get objects() {
    return this._objectById;
  }

  getTypes() {
    return Array.from(
      Array.from(this._objectById.values()).reduce((set, { id }) => set.add(ObjectModel.parseId(id).type), new Set())
    );
  }

  /**
   * Returns an unordered array of objects by type.
   */
  getObjects(type) {
    return Array.from(this._objectById.values()).filter(({ id }) => ObjectModel.parseId(id).type === type);
  }

  reset() {
    this._objectById.clear();
    return this;
  }

  async commitMutations(mutations = []) {
    console.assert(this._view);
    return this._view.appendMutations(mutations);
  }

  // TODO(burdon): Compute delta (from last apply)?
  applyMutations(mutations = []) {
    this.reset();

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
