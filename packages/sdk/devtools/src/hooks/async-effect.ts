//
// Copyright 2020 DXOS.org
//

import { useEffect } from 'react';

export function useAsyncEffect (body: () => Promise<void | undefined | (() => void)>, deps?: readonly any[]) {
  useEffect(() => {
    const promise = body();
    return () => {
      void promise.then(cleanup => {
        if (typeof cleanup === 'function') {
          cleanup();
        }
      });
    };
  }, deps);
}
