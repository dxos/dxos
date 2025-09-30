//
// Copyright 2025 DXOS.org
//

import { Rx } from '@effect-rx/rx-react';

import { type QueryResult } from '@dxos/echo-db';
import { type AnyEchoObject } from '@dxos/echo/internal';

export const rxFromQuery = <T extends AnyEchoObject>(query: QueryResult<T>): Rx.Rx<T[]> => {
  return Rx.make((get) => {
    const unsubscribe = query.subscribe((result) => {
      get.setSelf(result.objects);
    });

    get.addFinalizer(() => unsubscribe());

    return query.objects;
  });
};
