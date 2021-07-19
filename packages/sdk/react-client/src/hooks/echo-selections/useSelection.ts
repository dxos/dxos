//
// Copyright 2020 DXOS.org
//

import { useEffect, useState } from 'react';

import { SelectionResult } from '@dxos/echo-db';

/**
 * Hook to generate values from a selection using a selector function.
 *
 * @param [selection] Source selection (can be initially undefined).
 * @param selector Callback to generate data from the source selection.
 * @param [deps] Array of values that trigger the selector when changed.
 */
export function useSelection<T> (
  selectionResult: SelectionResult<T>,
  deps: readonly any[] = []
): T | undefined {
  const [data, setData] = useState(() => selectionResult.getValue());

  // Update data when deps change.
  useEffect(() => {
    const unsub = selectionResult.update.on(() => {
      setData(selectionResult.getValue());
    });
    setData(selectionResult.getValue());
    return unsub;
  }, deps);

  return data;
}
