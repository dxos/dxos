//
// Copyright 2024 DXOS.org
//

import { useEffect, useState } from 'react';

/**
 * @deprecated
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
