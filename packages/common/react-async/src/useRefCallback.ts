//
// Copyright 2024 DXOS.org
//

import { type RefCallback, useState } from 'react';

/**
 * @deprecated This function is deprecated and may be removed in future versions.
 */
export const useRefCallback = <T = any>(): { ref: RefCallback<T>; value: T | null } => {
  const [value, setValue] = useState<T | null>(null);
  return {
    ref: (value) => setValue(value),
    value,
  };
};
