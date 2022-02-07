//
// Copyright 2020 DXOS.org
//

import { useEffect, useState } from 'react';

import { Entity, Selection } from '@dxos/client';
import { Falsy } from '@dxos/util';

/**
 * Hook to generate values from a selection using a selector function.
 *
 * NOTE:
 * All values that may change the selection result,
 * apart from changes in ECHO database itself, must be passed to deps array
 * for updates to work correctly.
 *
 * @param selection Selection from which to query data. Can be falsy - in that case the hook will return undefined.
 * @param deps Array of values that trigger the selector when changed.
 */
export function useSelection<T extends Entity<any>> (
  selection: Selection<T> | Falsy,
  deps: readonly any[] = []
): T[] | undefined {
  const [result, setResult] = useState(() => selection ? selection.query() : undefined);
  const [data, setData] = useState(() => result ? result.result : undefined);

  // Update selection when deps change.
  useEffect(() => {
    const newResult = selection ? selection.query() : undefined;
    const newData = newResult ? newResult.result : undefined;
    setResult(newResult);
    setData(newData);
  }, [...deps, result?.root, !!selection]);

  // Update data when database updates.
  useEffect(() => {
    if (result) {
      return result.update.on(newData => {
        setData(newData);
      });
    }
  }, [result]);

  return data;
}
