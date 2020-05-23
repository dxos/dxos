//
// Copyright 2020 DxOS
//

import { createId } from '@dxos/crypto';

import { KeyValueUtil, MutationUtil } from './mutation';

/**
 * Crate typed object identifier.
 * @param {string} type
 * @param {string} [id]
 * @return {string} ID
 */
// TODO(burdon): Make url safe?
export const createObjectId = (type, id = undefined) => {
  console.assert(type);
  return `${type}/${id || createId()}`;
};

/**
 * Parse ID string.
 * @param {string} id
 * @return {{id: string, type: string}}
 */
export const parseId = (id) => {
  const parts = id.split('/');
  console.assert(parts.length === 2 ? parts[0] : parts[1]);
  return { type: parts[0], id: parts[1] };
};

/**
 * Create a set mutation messages from a single object.
 * @param {Object} object
 * @return {Mutation[]}
 */
// TODO(burdon): Single mutation.
export const fromObject = (object) => {
  return Object.keys(object.properties || {}).map((property) => {
    return MutationUtil.createMessage(
      object.id, KeyValueUtil.createMessage(property, object.properties[property])
    );
  });
};

/**
 * Create a set mutation messages from a collection of objects.
 * @param {Object[]} objects
 * @return {Mutation[]}
 */
export const fromObjects = (objects) => {
  return objects.reduce((messages, object) => {
    return messages.concat(fromObject(object));
  }, []);
};

/**
 * Sorting function for Array.sort.
 * @param {string} property
 */
export const sortByProperty = property => ({ [property]: a }, { [property]: b }) => (a > b ? 1 : a < b ? -1 : 0);
