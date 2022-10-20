//
// Copyright 2021 DXOS.org
//

import { DependencyList, useEffect, useState } from 'react';

import { MaybePromise } from '@dxos/util';

interface Result<T> {
  data: T
  error?: unknown
}

/**
 * Async data fetcher.
 * @param getData
 * @param initalValue
 * @param deps
 */
// TODO(burdon): Rename.
export const useAsync = <T>(getData: () => MaybePromise<T> | undefined, initalValue: T, deps: DependencyList = []): Result<T> => {
  const [error, setError] = useState<any>(undefined);
  const [data, setData] = useState<T>(initalValue);

  useEffect(() => {
    setTimeout(async () => {
      try {
        const data = await getData();
        data && setData(data);
      } catch (e: unknown) {
        setError(e);
      }
    });
  }, deps);

  return {
    data,
    error
  };
};
