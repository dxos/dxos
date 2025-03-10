//
// Copyright 2023 DXOS.org
//

import { type Dispatch, type SetStateAction, useEffect, useState } from 'react';

/**
 * A stateful hook with a controlled value.
 */
export const useControlledState = <T>(controlledValue: T, ...deps: any[]): [T, Dispatch<SetStateAction<T>>] => {
  const [value, setValue] = useState<T>(controlledValue);
  useEffect(() => {
    if (controlledValue !== undefined) {
      setValue(controlledValue);
    }
  }, [controlledValue, ...deps]);

  return [value, setValue];
};
