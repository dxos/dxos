//
// Copyright 2020 DXOS.org
//

import { useMemo } from 'react';
import { useSubscription } from 'use-subscription';

import { ResultSet } from '@dxos/echo-db';

/**
 * A convenience hook used for subscribing to changing values of a result set.
 * Result sets are reactive query results from ECHO.
 * @param resultSet The result set to subscribe to
 * @returns Always up-to-date value of the result set
 */
export function useResultSet<T> (resultSet: ResultSet<T>): T[] {
  return useSubscription(useMemo(() => ({
    getCurrentValue: () => resultSet.value,
    subscribe: (cb: any) => resultSet.subscribe(cb)
  }), [resultSet]));
}
