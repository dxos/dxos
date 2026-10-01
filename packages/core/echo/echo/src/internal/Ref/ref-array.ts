//
// Copyright 2024 DXOS.org
//

import { type EntityId } from '@dxos/keys';
import { isNonNullable } from '@dxos/util';

import { type AnyEntity } from '../common/types/index.ts';
import { type LoadOptions, Ref } from './ref.ts';

/**
 * Helper functions for working with arrays of refs.
 */
export const RefArray = Object.freeze({
  /**
   * @returns all resolved targets.
   */
  targets: <T extends AnyEntity>(refs: readonly Ref<T>[]): T[] => {
    return refs.map((ref) => ref.target).filter(isNonNullable);
  },

  /**
   * Removes the ref with the given id.
   */
  removeById: (refs: Ref<AnyEntity>[], id: EntityId) => {
    const index = refs.findIndex(Ref.hasEntityId(id));
    if (index >= 0) {
      refs.splice(index, 1);
    }
  },
});

/**
 * Loads the targets of `refs` in ref order, omitting missing targets and, unless
 * `{ deleted: 'include' }` asks for them, deleted ones.
 */
export const loadAll = async <T>(refs: readonly Ref<T>[], options?: LoadOptions): Promise<T[]> =>
  (await Promise.all(refs.map((ref) => ref.tryLoad(options)))).filter(isNonNullable);
