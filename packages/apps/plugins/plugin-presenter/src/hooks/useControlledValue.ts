//
// Copyright 2023 DXOS.org
//

import { type Dispatch, type SetStateAction, useEffect, useState } from 'react';

// TODO(burdon): Factor out.
export const useControlledValue = <TValue>(controlledValue: TValue): [TValue, Dispatch<SetStateAction<TValue>>] => {
  const [value, setValue] = useState<TValue>(controlledValue);
  useEffect(() => {
    setValue(controlledValue);
  }, [controlledValue]);
  return [value, setValue];
};
