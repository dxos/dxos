//
// Copyright 2023 DXOS.org
//

import { type Dispatch, type SetStateAction, useCallback, useEffect, useRef, useState } from 'react';

/**
 * A stateful hook with a controlled value.
 * @deprecated Use Radix `useControllableState` (NOTE: `useControlledState` is not compatible with `useControllableState`)
 */
export const useControlledState = <T>(
  valueParam: T,
  onChange?: Dispatch<SetStateAction<T>>,
): [T, Dispatch<SetStateAction<T>>] => {
  const [value, setControlledValue] = useState(valueParam);
  useEffect(() => {
    setControlledValue(valueParam);
  }, [valueParam]);

  const onChangeRef = useRef(onChange);
  const setValue = useCallback<Dispatch<SetStateAction<T>>>(
    (value) => {
      setControlledValue(value);
      onChangeRef.current?.(value);
    },
    [onChangeRef],
  );

  return [value, setValue];
};
