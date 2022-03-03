//
// Copyright 2020 DXOS.org
//

import { useEffect, useState } from 'react';

import { Entity, Selection, SelectionResult } from '@dxos/client';
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
export const useSelection = <T extends Entity<any>> (
  selection: Selection<T> | SelectionResult<T> | Falsy,
  deps: readonly any[] = []
): T[] | undefined => {
  const [result, setResult] = useState(() => coerceSelection(selection));
  const [data, setData] = useState<T[] | undefined>(() => result ? result.result : undefined);

  // Update selection when the query or customs deps change.
  useEffect(() => {
    const newResult = coerceSelection(selection);
    setResult(newResult);
    setData(newResult?.result);
  }, [!!selection, !!selection && selection.root, ...deps]);

  // Update data when database updates.
  useEffect(() => {
    if (result) {
      return result.update.on((entities: T[]) => {
        setData(entities);
      });
    }
  }, [result]);

  return data;
};

/**
 * @param selection
 * @param value
 * @param deps
 */
// TODO(burdon): Factor out common code with useSelection.
export const useReducer = <T extends Entity<any>, R> (
  selection: Selection<T> | SelectionResult<T> | Falsy,
  value: R,
  deps: readonly any[] = []
) => {
  const [result, setResult] = useState(() => coerceSelection(selection));
  const [data, setData] = useState<R | undefined>(() => result ? result.value : undefined);

  // Update selection when the query or customs deps change.
  useEffect(() => {
    const newResult = coerceSelection(selection);
    setResult(newResult);
    setData(newResult?.value);
  }, [!!selection, !!selection && selection.root, ...deps]);

  // Update data when database updates.
  useEffect(() => {
    if (result) {
      return result.update.on(() => {
        setData(result.value);
      });
    }
  }, [result]);

  return data;
};

/**
 * @param arg
 */
// TODO(burdon): ???
const coerceSelection = <T extends Entity>(
  arg: Selection<T> | SelectionResult<T> | Falsy
): SelectionResult<T> | undefined => !arg ? undefined : arg instanceof Selection ? arg.query() : arg;
