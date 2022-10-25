//
// Copyright 2022 DXOS.org
//

import { RefObject, useEffect, useRef, useState } from 'react';

/**
 * Extension of useRef that contains computed values based on dependencies.
 * E.g., to use in callbacks where the state value is stale.
 *
 * ```tsx
 * const valueRef = useDynamicRef<() => value>([value]);
 * const handleAction = () => {
 *   console.log(valueRef.current);
 * }
 * ```
 *
 * @param initialValue
 * @param deps
 */
export const useDynamicRef = <V>(initialValue: () => V, deps: any[]): RefObject<V> => {
  const [, setValue] = useState<V>(initialValue);
  const ref = useRef<V>(initialValue());
  useEffect(() => {
    ref.current = initialValue();
    // Must update state to trigger render cycle.
    setValue(ref.current);
  }, deps);

  return ref;
};
