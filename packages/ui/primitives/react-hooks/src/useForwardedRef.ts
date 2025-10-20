//
// Copyright 2022 DXOS.org
//

import { type ForwardedRef, useEffect, useRef } from 'react';

/**
 * Combines a possibly undefined forwarded ref with a locally defined ref.
 */
export const useForwardedRef = <T>(ref: ForwardedRef<T>) => {
  const innerRef = useRef<T>(null);
  useEffect(() => {
    updateRef(ref, innerRef.current);
  }, [ref]);

  return innerRef;
};

export const updateRef = <T>(ref: ForwardedRef<T>, value: T) => {
  if (!ref) {
    return;
  }

  if (typeof ref === 'function') {
    ref(value);
  } else {
    ref.current = value;
  }
};
