//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';
import { EventEmitter } from 'events';

import { MutationUtil, ValueUtil } from './mutation';
import { parseObjectId } from './util';
import { dxos } from './proto/gen/echo';

interface ObjectBase {
  id: string,
  properties?: object,
}

const log = debug('dxos:echo:object-store');

/**
 * Create a set mutation messages from a single object.
 */
// TODO(burdon): Rename and move.
export const fromObject = ({ id, properties = {} }: ObjectBase): dxos.echo.IObjectMutation => {
  assert(id);

  return {
    objectId: id,
    mutations: Object.entries(properties).map(([key, value]) => ({
      key,
      value: ValueUtil.createMessage(value)
    }))
  };
};

/**
 * Create a set mutation messages from a collection of objects.
 */
export const fromObjects = (objects: ObjectBase[]): dxos.echo.IObjectMutation[] => {
  return objects.map(fromObject);
};

/**
 * Simple Object Datastore.
 */
// TODO(burdon): Separate mutable and immutable interface.
// TODO(burdon): Document consistency constraints (e.g., each Object is independent; mutation references previous).
export class ObjectStore extends EventEmitter {
  // Objects indexed by ID.
  // TODO(burdon): Create secondary index by type.
  _objectById = new Map();

  /**
   * Returns an array of object types.
   * @returns {string[]}
   */
  getTypes () {
    return Array.from(
      Array.from(this._objectById.values()).reduce((set, { id }) => set.add(parseObjectId(id).type), new Set())
    );
  }

  /**
   * Returns an array of objects by type in an unspecified order.
   * @returns {Object[]}
   */
  // TODO(burdon): orderBy?
  getObjectsByType (type: string) {
    return Array.from(this._objectById.values()).filter(({ id }) => parseObjectId(id).type === type);
  }

  /**
   * Returns the object with the given ID (or undefined).
   * @param id
   * @returns {{ id }}
   */
  getObjectById (id: string) {
    return this._objectById.get(id);
  }

  /**
   * Resets the entire model.
   * @returns {ObjectStore}
   */
  reset () {
    this._objectById.clear();
    return this;
  }

  /**
   * Applies an array of mutations, updating the state.
   * @param mutation
   * @returns {ObjectStore}
   */
  applyMutation (mutation: dxos.echo.IObjectMutation) {
    const { objectId, deleted, mutations } = mutation;
    assert(objectId);

    // Remove object.
    // TODO(burdon): Mark as deleted instead of removing from map?
    if (deleted) {
      this._objectById.delete(objectId);
      return this;
    }

    // Create object if not found.
    let object = this._objectById.get(objectId);
    if (!object) {
      object = {
        id: objectId,
        properties: {}
      };

      this._objectById.set(objectId, object);
    }

    MutationUtil.applyMutations(object.properties, mutations || []);

    return this;
  }

  applyMutations (mutations: dxos.echo.IObjectMutation[]) {
    log(`applyMutations: ${JSON.stringify(mutations)}`);
    mutations.forEach(mutation => this.applyMutation(mutation));

    return this;
  }
}
