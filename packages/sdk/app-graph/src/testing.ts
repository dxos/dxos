//
// Copyright 2025 DXOS.org
//

import { Rx } from '@effect-rx/rx-react';

import { type QueryResult } from '@dxos/echo-db';
import { type BaseObject } from '@dxos/echo-schema';

export const rxFromQuery = <T extends BaseObject>(query: QueryResult<T>): Rx.Rx<T[]> => {
  return Rx.readable((get) => {
    const unsubscribe = query.subscribe((result) => {
      get.setSelf(result.objects);
    });

    get.addFinalizer(() => unsubscribe());

    return query.objects;
  });
};
