//
// Copyright 2024 DXOS.org
//

import { type Dispatch, type SetStateAction, useEffect, useState } from 'react';

/**
 * NOTE: Use with care and when necessary to be able to cancel an async operation when unmounting.
 */
export const useAsyncState = <T>(
  cb: () => Promise<T | undefined>,
  deps: any[] = [],
): [T | undefined, Dispatch<SetStateAction<T | undefined>>] => {
  const [value, setValue] = useState<T | undefined>();
  useEffect(() => {
    let disposed = false;
    const t = setTimeout(async () => {
      const data = await cb();
      if (!disposed) {
        setValue(data);
      }
    });

    return () => {
      disposed = true;
      clearTimeout(t);
    };
  }, deps);

  return [value, setValue];
};
