//
// Copyright 2024 DXOS.org
//

import { useEffect, useState } from 'react';

export const usePromise = <T>(promise?: Promise<T>) => {
  const [value, setValue] = useState<T | undefined>(undefined);
  useEffect(() => {
    if (!promise) {
      return;
    }
    promise.then(setValue).catch((err) => {
      throw err;
    });
  }, [promise]);
  return value;
};
