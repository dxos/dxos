//
// Copyright 2024 DXOS.org
//

import { isNonNullable } from '@dxos/util';

import { ObjectId } from '@dxos/keys';
import type { BaseObject } from '../types';
import { Ref } from './ref';

/**
 * Helper functions for working with arrays of refs.
 */
export const RefArray = Object.freeze({
  /**
   * @returns all resolved targets.
   */
  targets: <T extends BaseObject>(refs: Ref<T>[]): T[] => {
    return refs.map((ref) => ref.target).filter(isNonNullable);
  },

  /**
   * Load all referenced objects.
   */
  loadAll: <T extends BaseObject>(refs: Ref<T>[]): Promise<T[]> => {
    return Promise.all(refs.map((ref) => ref.load()));
  },

  /**
   * Removes the ref with the given id.
   */
  removeById: (refs: Ref<BaseObject>[], id: ObjectId) => {
    const index = refs.findIndex(Ref.hasObjectId(id));
    if (index >= 0) {
      refs.splice(index, 1);
    }
  },
});
