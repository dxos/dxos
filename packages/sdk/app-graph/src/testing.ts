//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';

import { type AnyEchoObject } from '@dxos/echo/internal';
import { type QueryResult } from '@dxos/echo-db';

export const rxFromQuery = <T extends AnyEchoObject>(query: QueryResult<T>): Atom.Atom<T[]> => {
  return Atom.make((get) => {
    const unsubscribe = query.subscribe((result) => {
      get.setSelf(result.objects);
    });

    get.addFinalizer(() => unsubscribe());

    return query.objects;
  });
};
