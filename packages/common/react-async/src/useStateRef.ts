//
// Copyright 2022 DXOS.org
//

import {
  Dispatch,
  RefObject,
  SetStateAction,
  useEffect,
  useRef,
  useState
} from 'react';

/**
 * Extension of useState to return an up-to-date reference.
 * E.g., to use in callbacks where the state value is stale.
 *
 * ```tsx
 * const [value, setValue, valueRef] = useStateRef<string>();
 * const handleAction = () => {
 *   console.log(valueRef.current);
 * }
 * ```
 *
 * @param initialValue
 */
// TODO(burdon): Replace with useCallback?
export const useStateRef = <V>(
  initialValue?: V | (() => V)
): [
  V | undefined,
  Dispatch<SetStateAction<V | undefined>>,
  RefObject<V | undefined>
] => {
  const [value, setValue] = useState<V | undefined>(initialValue);
  const ref = useRef<V>();
  useEffect(() => {
    ref.current = value;
  }, [initialValue, value]);

  return [value, setValue, ref];
};
