//
// Copyright 2021 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { MaybePromise } from '@dxos/util';

interface Result<T> {
  data: T,
  error?: unknown
}

export const useAsync = <T>(getData: () => MaybePromise<T> | undefined, initalValue: T, deps: React.DependencyList = []): Result<T> => {
  const [error, setError] = useState<any>(undefined);
  const [data, setData] = useState<T>(initalValue);

  useEffect(() => {
    setImmediate(async () => {
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
