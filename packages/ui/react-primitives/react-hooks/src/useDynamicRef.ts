//
// Copyright 2024 DXOS.org
//

import { type Dispatch, type RefObject, type SetStateAction, useCallback, useEffect, useRef, useState } from 'react';

/**
 * Like `useState` but with an additional dynamic value.
 */
export const useStateWithRef = <T>(valueParam: T): [T, Dispatch<SetStateAction<T>>, RefObject<T>] => {
  const [value, setValue] = useState<T>(valueParam);
  const valueRef = useRef<T>(valueParam);
  const setter = useCallback<Dispatch<SetStateAction<T>>>((value) => {
    if (typeof value === 'function') {
      setValue((current) => {
        valueRef.current = (value as Function)(current);
        return valueRef.current;
      });
    } else {
      valueRef.current = value;
      setValue(value);
    }
  }, []);

  return [value, setter, valueRef];
};

/**
 * Ref that is updated by a dependency.
 */
export const useDynamicRef = <T>(value: T): RefObject<T> => {
  const valueRef = useRef<T>(value);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  return valueRef;
};
