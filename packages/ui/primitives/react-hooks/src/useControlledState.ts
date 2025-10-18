//
// Copyright 2023 DXOS.org
//

import { type Dispatch, type SetStateAction, useEffect, useState } from 'react';

/**
 * A stateful hook with a controlled value.
 * NOTE: Be careful not to provide an inlinde default array.
 * @deprecated Use Radix `useControllableState`.
 */
export const useControlledState = <T>(
  controlledValue: T,
  onChange?: (value: T) => void,
  ...deps: any[]
): [T, Dispatch<SetStateAction<T>>] => {
  const [value, setValue] = useState<T>(controlledValue);
  useEffect(() => {
    if (controlledValue !== undefined) {
      setValue(controlledValue);
    }
  }, [controlledValue, ...deps]);

  useEffect(() => {
    onChange?.(value);
  }, [value, onChange]);

  return [value, setValue];
};
