//
// Copyright 2025 DXOS.org
//

import * as Atom from '@effect-atom/atom/Atom';

import type * as QueryResult from '../QueryResult';

/**
 * Create a self-updating atom from a QueryResult.
 * Subscribes to the queryResult and updates when results change.
 * Cleanup is handled via get.addFinalizer.
 */
export const fromQueryResult = <T>(queryResult: QueryResult.QueryResult<T>): Atom.Atom<T[]> =>
  Atom.make((get) => {
    const unsubscribe = queryResult.subscribe(() => {
      get.setSelf(queryResult.runSync());
    });
    get.addFinalizer(unsubscribe);
    return queryResult.runSync();
  });
