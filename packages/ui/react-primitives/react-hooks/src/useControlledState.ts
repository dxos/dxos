//
// Copyright 2023 DXOS.org
//

import { type Dispatch, type SetStateAction, useCallback, useEffect, useRef, useState } from 'react';

import { useDynamicRef } from './useDynamicRef';

/**
 * A stateful hook with a controlled value.
 * NOTE: Consider using Radix's `useControllableState`.
 */
export const useControlledState = <T>(
  valueProp: T,
  onChange?: (value: T) => void,
): [T, Dispatch<SetStateAction<T>>] => {
  const [value, setControlledValue] = useState(valueProp);
  useEffect(() => {
    setControlledValue(valueProp);
  }, [valueProp]);

  const onChangeRef = useRef(onChange);
  const valueRef = useDynamicRef(valueProp);
  const setValue = useCallback<Dispatch<SetStateAction<T>>>(
    (nextValue) => {
      const value = isFunction(nextValue) ? nextValue(valueRef.current) : nextValue;
      setControlledValue(value);
      onChangeRef.current?.(value);
    },
    [valueRef, onChangeRef],
  );

  return [value, setValue];
};

function isFunction(value: unknown): value is (...args: any[]) => any {
  return typeof value === 'function';
}
