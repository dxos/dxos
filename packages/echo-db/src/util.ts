//
// Copyright 2020 DXOS.org
//

import assert from 'assert';

import { createId } from '@dxos/crypto';

/**
 * Create typed object identifier.
 */
export const createObjectId = (type: string, id?: string) => {
  assert(type, 'Required type');

  return `${type}/${id || createId()}`;
};

/**
 * Parse ID string.
 */
export const parseObjectId = (id: string) => {
  const parts = id.split('/');
  assert(parts.length === 2 ? parts[0] : parts[1]);

  return { type: parts[0], id: parts[1] };
};

/**
 * Sorting function for Array.sort.
 */
export const sortByProperty = <T>(property: keyof T) =>
  ({ [property]: a }: T, { [property]: b }: T) => (a > b ? 1 : a < b ? -1 : 0);

/**
 * Immediatelly throws an error passed as an argument.
 *
 * Usefull for throwing errors from inside expressions.
 * For example:
 * ```
 * const item = model.getById(someId) ?? raise(new Error('Not found'));
 * ```
 * @param error
 */
export const raise = (error: Error): never => {
  throw error;
};
