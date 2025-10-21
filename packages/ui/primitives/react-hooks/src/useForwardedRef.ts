//
// Copyright 2022 DXOS.org
//

import { type ForwardedRef, type RefObject, useEffect, useRef } from 'react';

/**
 * Combines a possibly undefined forwarded ref with a locally defined ref.
 */
export const useForwardedRef = <T>(ref: ForwardedRef<T>): RefObject<T | null> => {
  const innerRef = useRef<T | null>(null);
  useEffect(() => {
    updateRef(ref, innerRef.current);
  }, [ref]);

  return innerRef;
};

export const updateRef = <T>(ref: ForwardedRef<T>, value: T): void => {
  if (!ref) {
    return;
  }

  if (typeof ref === 'function') {
    ref(value);
  } else {
    ref.current = value;
  }
};
