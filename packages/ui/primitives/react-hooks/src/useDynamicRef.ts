//
// Copyright 2024 DXOS.org
//

import { useEffect, useRef } from 'react';

/**
 * Ref that is updated by a dependency.
 */
export const useDynamicRef = <T>(value: T) => {
  const ref = useRef<T>(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref;
};
