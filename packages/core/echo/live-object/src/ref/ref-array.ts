//
// Copyright 2024 DXOS.org
//

import type { BaseObject, ObjectId, Ref } from '@dxos/echo-schema';
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

  /**
   * @returns index of the ref with the given id.
   */
  findIndexById: (refs: Ref<BaseObject>[], id: ObjectId): number => {
    return refs.findIndex((ref) => ref.target?.id === id);
  },

  /**
   * Removes the ref with the given id.
   */
  removeById: (refs: Ref<BaseObject>[], id: ObjectId) => {
    const index = RefArray.findIndexById(refs, id);
    if (index >= 0) {
      refs.splice(index, 1);
    }
  },
});
