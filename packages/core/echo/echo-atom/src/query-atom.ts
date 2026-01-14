//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom';

import type { Entity, QueryResult } from '@dxos/echo';

/**
 * Namespace for Query Atom utility functions.
 */
export namespace AtomQuery {
  /**
   * Create a self-updating atom for a QueryResult.
   * Internally subscribes to queryResult and uses get.setSelf to update.
   * Cleanup is handled via get.addFinalizer.
   *
   * @param queryResult - The QueryResult to wrap.
   * @returns An atom that automatically updates when query results change.
   */
  export function make<T extends Entity.Unknown>(queryResult: QueryResult.QueryResult<T>): Atom.Atom<T[]> {
    return Atom.make((get) => {
      // Subscribe to QueryResult changes.
      const unsubscribe = queryResult.subscribe(() => {
        get.setSelf(queryResult.results);
      });

      // Register cleanup for when atom is no longer used.
      get.addFinalizer(unsubscribe);

      return queryResult.results;
    });
  }
}
