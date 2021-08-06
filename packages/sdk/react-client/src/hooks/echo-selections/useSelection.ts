//
// Copyright 2020 DXOS.org
//

import { useEffect, useState } from 'react';

import { SelectionResult } from '@dxos/echo-db';
import { Falsy } from '@dxos/util';

/**
 * Hook to generate values from a selection using a selector function.
 * 
 * NOTE: 
 * All values that may change the selection result,
 * apart from changes in ECHO database itself, must be passed to deps array
 * for updates to work correctly.
 *
 * @param selectionResult Selection from which to query data. Can be falsy - in that case the hook will return undefined.
 * @param deps Array of values that trigger the selector when changed.
 */
export function useSelection<T> (
  selectionResult: SelectionResult<T> | Falsy,
  deps: readonly any[] = []
): T | undefined {
  const [data, setData] = useState(() => !!selectionResult ? selectionResult.getValue() : undefined);

  // Update data when deps change.
  useEffect(() => {
    if(selectionResult) {
      const unsub = selectionResult.update.on(() => {
        setData(selectionResult.getValue());
      });
      setData(selectionResult.getValue());
      return unsub;
    } else {
      setData(undefined);
    }
  }, deps);

  return data;
}
