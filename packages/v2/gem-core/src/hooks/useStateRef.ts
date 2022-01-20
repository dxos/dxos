//
// Copyright 2021 DXOS.org
//

import { Dispatch, RefObject, SetStateAction, useEffect, useRef, useState } from 'react';

/**
 * Extension of useState to return an up-to-date reference.
 * E.g., to use in callbacks where the state value is stale.
 * @param initialValue
 */
export const useStateRef = <V extends any>(
  initialValue?: V | (() => V)
): [V, Dispatch<SetStateAction<V>>, RefObject<V>] => {
  const [value, setValue] = useState<V>(initialValue);
  const ref = useRef<V>();
  useEffect(() => {
    ref.current = value;
  }, [initialValue, value]);

  return [value, setValue, ref];
};
