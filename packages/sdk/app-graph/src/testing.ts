//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';

import { type Database, type Obj } from '@dxos/echo';

export const atomFromQuery = <T extends Obj.Any>(query: Database.QueryResult<T>): Atom.Atom<T[]> => {
  return Atom.make((get) => {
    const unsubscribe = query.subscribe((result) => {
      get.setSelf(result.objects);
    });

    get.addFinalizer(() => unsubscribe());

    return query.objects;
  });
};
