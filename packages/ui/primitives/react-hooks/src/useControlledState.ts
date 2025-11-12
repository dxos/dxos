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
): [T, Dispatch<SetStateAction<T>>] => {
  const [value, setValue] = useState<T>(controlledValue);
  useEffect(() => {
    if (controlledValue !== undefined) {
      setValue(controlledValue);
    }
  }, [controlledValue]);

  useEffect(() => {
    if (value !== controlledValue) {
      console.log(value, controlledValue);
      // onChange?.(value);
    }
  }, [value, controlledValue, onChange]);

  return [value, setValue];
};
