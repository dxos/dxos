//
// Copyright 2023 DXOS.org
//

import { type Dispatch, type SetStateAction, useEffect, useState } from 'react';

/**
 * A stateful hook with a controlled value.
 */
export const useControlledValue = <TValue>(controlledValue: TValue): [TValue, Dispatch<SetStateAction<TValue>>] => {
  const [value, setValue] = useState<TValue>(controlledValue);

  // TODO(burdon): ???
  useEffect(() => {
    setValue(controlledValue);
  }, [controlledValue]);

  return [value, setValue];
};
