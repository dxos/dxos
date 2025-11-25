//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';

import { type Database } from '@dxos/echo';
import { type AnyEchoObject } from '@dxos/echo/internal';

export const atomFromQuery = <T extends AnyEchoObject>(query: Database.QueryResult<T>): Atom.Atom<T[]> => {
  return Atom.make((get) => {
    const unsubscribe = query.subscribe((result) => {
      get.setSelf(result.objects);
    });

    get.addFinalizer(() => unsubscribe());

    return query.objects;
  });
};
