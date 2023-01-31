//
// Copyright 2020 DXOS.org
//

import { useMemo, useSyncExternalStore } from 'react';

import { Entity, Selection, SelectionResult } from '@dxos/client';
import { log } from '@dxos/log';
import { Falsy } from '@dxos/util';

/**
 * Hook to generate values from a selection using a selector function.
 *
 * NOTE:
 * All values that may change the selection result  must be passed to deps array
 * for updates to work correctly.
 *
 * @param selection Selection from which to query data. Can be falsy - in that case the hook will return undefined.
 * @param deps Array of values that trigger the selector when changed.
 */
export const useSelection = <T extends Entity<any>>(
  selection: Selection<T> | SelectionResult<T> | Falsy
): T[] | undefined => {
  const result = useMemo(() => {
    log('coerce selection', selection);
    return coerceSelection(selection);
  }, [!!selection && selection.root]);

  const data = useSyncExternalStore(
    (listener) => {
      if (!result) {
        return () => {};
      }

      log('selection subscribe', { result });
      const unsubscribe = result.update.on(() => {
        log('selection emit', { result });
        listener();
      });
      return () => {
        log('selection unsubscribe', { result });
        unsubscribe();
      };
    },
    () => {
      log('selection snapshot', { data: result?.entities });
      return result?.entities;
    }
  );

  return data;
};

/**
 * @param value Selection or SelectionResult from hook.
 */
const coerceSelection = <T extends Entity>(
  value: Selection<T> | SelectionResult<T> | Falsy
): SelectionResult<T> | undefined => (!value ? undefined : value instanceof Selection ? value.exec() : value);
