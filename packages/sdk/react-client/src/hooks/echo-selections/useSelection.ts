//
// Copyright 2020 DXOS.org
//

import { useEffect, useState } from 'react';

import { Selection } from '@dxos/echo-db';

/**
 * Hook to generate values from a selection using a selector function.
 *
 * @param [selection] Source selection (can be initially undefined).
 * @param selector Callback to generate data from the source selection.
 * @param [deps] Array of values that trigger the selector when changed.
 */
export function useSelection<T> (
  selection: Selection<any> | undefined,
  selector: (selection: Selection<any>) => T,
  deps: readonly any[] = []
): T | undefined {
  const [data, setData] = useState(() => selection && selector(selection));

  // Subscribe to mutation events from source.
  useEffect(() => {
    return selection && selection.update.on(() => {
      setData(selector(selection));
    });
  }, [selection]);

  // Update data when deps change.
  useEffect(() => {
    selection && setData(selector(selection));
  }, deps);

  return data;
}
