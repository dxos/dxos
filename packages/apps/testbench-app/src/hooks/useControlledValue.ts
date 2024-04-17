//
// Copyright 2024 DXOS.org
//

import { type Dispatch, type SetStateAction, useEffect, useState } from 'react';

export const useControlledValue = <T>(_value: T, onChange?: (value: T) => void): [T, Dispatch<SetStateAction<T>>] => {
  const [value, setValue] = useState<T>(_value);
  useEffect(() => setValue(_value), [_value]);
  useEffect(() => onChange?.(_value), [value]);
  return [value, setValue];
};
