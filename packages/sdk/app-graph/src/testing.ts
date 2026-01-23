//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';

import { type Entity, type QueryResult } from '@dxos/echo';

export const atomFromQuery = <T extends Entity.Unknown = Entity.Unknown>(
  query: QueryResult.QueryResult<T>,
): Atom.Atom<T[]> => {
  return Atom.make((get) => {
    const unsubscribe = query.subscribe((result) => {
      get.setSelf(result.results);
    });

    get.addFinalizer(() => unsubscribe());

    return query.results;
  });
};
