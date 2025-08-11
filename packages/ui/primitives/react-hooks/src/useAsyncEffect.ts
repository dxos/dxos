//
// Copyright 2022 DXOS.org
//

import { useEffect } from 'react';

export const useAsyncEffect = <T>(callback: () => Promise<T> | void, deps?: any[]) => {
  useEffect(() => {
    const t = setTimeout(() => {
      void callback();
    });
    return () => clearTimeout(t);
  }, deps);
};
