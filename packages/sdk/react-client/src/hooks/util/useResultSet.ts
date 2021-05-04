//
// Copyright 2020 DXOS.org
//

import { ResultSet } from "@dxos/echo-db";
import { useMemo } from "react";
import { useSubscription } from 'use-subscription';


export function useResultSet<T> (resultSet: ResultSet<T>): T[] {
  return useSubscription(useMemo(() => ({
    getCurrentValue: () => resultSet.value,
    subscribe: (cb: any) => resultSet.subscribe(cb)
  }), [resultSet]));
}
