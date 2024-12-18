//
// Copyright 2024 DXOS.org
//

import { BaseObject, ObjectId, Ref } from '@dxos/echo-schema';
import { nonNullable } from '@dxos/util';

/**
 * Helper functions for working with arrays of refs.
 */
export const RefArray = Object.freeze({
  /**
   * @returns all resolved targets.
   */
  allResolvedTargets: <T extends BaseObject>(refs: Ref<T>[]): T[] => {
    return refs.map((ref) => ref.target).filter(nonNullable);
  },

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
