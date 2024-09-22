//
// Copyright 2024 DXOS.org
//

import { useEffect, useState } from 'react';

/**
 * NOTE: Use with care and when necessary to be able to cancel an async operation when unmounting.
 */
export const useAsyncCallback = <T>(cb: () => Promise<T>): T | undefined => {
  const [value, setValue] = useState<T | undefined>();
  useEffect(() => {
    const t = setTimeout(async () => {
      const data = await cb();
      setValue(data);
    });

    return () => clearTimeout(t);
  }, []);

  return value;
};
