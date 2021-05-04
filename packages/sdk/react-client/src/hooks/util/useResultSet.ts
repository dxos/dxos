//
// Copyright 2020 DXOS.org
//

import { useMemo } from 'react';
import { useSubscription } from 'use-subscription';

import { ResultSet } from '@dxos/echo-db';

export function useResultSet<T> (resultSet: ResultSet<T>): T[] {
  return useSubscription(useMemo(() => ({
    getCurrentValue: () => resultSet.value,
    subscribe: (cb: any) => resultSet.subscribe(cb)
  }), [resultSet]));
}
