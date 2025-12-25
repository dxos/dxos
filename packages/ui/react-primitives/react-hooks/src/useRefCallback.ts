//
// Copyright 2024 DXOS.org
//

import { type RefCallback, useState } from 'react';

/**
 * Custom React Hook that creates a ref callback and a state variable.
 * The ref callback sets the state variable when the ref changes.
 *
 * @returns An object containing the ref callback and the current value of the ref.
 */
export const useRefCallback = <T = any>(): { refCallback: RefCallback<T>; value: T | null } => {
  const [value, setValue] = useState<T | null>(null);
  return { refCallback: (value: T) => setValue(value), value };
};
