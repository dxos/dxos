//
// Copyright 2020 DXOS.org
//

import { useMemo } from 'react';
import { useSubscription } from 'use-subscription';

import { ResultSet } from '@dxos/echo-db';

/**
 * Turn array of callbacks into a single callback that calls them all.
 * @param callbacks
 */
export function liftCallback (callbacks: (() => void)[]): () => void {
  return () => callbacks.forEach(cb => cb());
}

/**
 * Helper to use async functions inside effects
 */
export function asyncEffect (fun: () => Promise<(() => void) | undefined>): () => (() => void) | undefined {
  return () => {
    const promise = fun();
    return () => promise.then(cb => cb?.());
  };
}

export function useResultSet<T> (resultSet: ResultSet<T>): T[] {
  return useSubscription(useMemo(() => ({
    getCurrentValue: () => resultSet.value,
    subscribe: cb => resultSet.subscribe(cb)
  }), [resultSet]));
}
