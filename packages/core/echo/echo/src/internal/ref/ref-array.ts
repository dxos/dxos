//
// Copyright 2024 DXOS.org
//

import { type ObjectId } from '@dxos/keys';
import { isNonNullable } from '@dxos/util';

import { type AnyEchoObject } from '../types';

import { Ref } from './ref';

/**
 * Helper functions for working with arrays of refs.
 */
export const RefArray = Object.freeze({
  /**
   * @returns all resolved targets.
   */
  targets: <T extends AnyEchoObject>(refs: readonly Ref<T>[]): T[] =>
    refs.map((ref) => ref.target).filter(isNonNullable),

  /**
   * Load all referenced objects.
   */
  loadAll: <T extends AnyEchoObject>(refs: readonly Ref<T>[]): Promise<T[]> =>
    Promise.all(refs.map((ref) => ref.load())),

  /**
   * Removes the ref with the given id.
   */
  removeById: (refs: Ref<AnyEchoObject>[], id: ObjectId) => {
    const index = refs.findIndex(Ref.hasObjectId(id));
    if (index >= 0) {
      refs.splice(index, 1);
    }
  },
});
