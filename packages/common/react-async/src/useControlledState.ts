//
// Copyright 2022 DXOS.org
//

import { Dispatch, SetStateAction, useEffect, useState } from 'react';

/**
 * Hook that manages state and that can be updated by caller.
 * The optional callback is triggered only if the state is updated internally.
 *
 * ```tsx
 * const Component = ({ value: controlledValue, onChange }) => {
 *   const [value, setValue] = useControlledState(controlledValue, onChange);
 *   const handleUpdate = (value: string) => setValue(value);
 * }
 *
 * @param controlledValue
 * @param onChange
 * @param deps other deps that may change the state
 */
export const useControlledState = <T>(
  controlledValue: T,
  onChange?: (value: T) => void,
  deps?: any[]
): [T, Dispatch<SetStateAction<T>>] => {
  const [value, setValue] = useState<T>(controlledValue);
  useEffect(() => {
    setValue(controlledValue);
  }, [controlledValue, ...(deps ?? [])]);

  return [
    value,
    (callback: T | ((previous: T) => T)) => {
      const newValue = typeof callback === 'function' ? (callback as Function)(value) : callback;
      setValue(newValue);
      onChange?.(newValue);
    }
  ];
};
