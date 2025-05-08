//
// Copyright 2022 DXOS.org
//

import { type ForwardedRef, useRef, useEffect } from 'react';

/**
 * Combines a possibly undefined forwarded ref with a locally defined ref.
 * See also: react-merge-refs
 */
export const useForwardedRef = <T>(ref: ForwardedRef<T>) => {
  const innerRef = useRef<T>(null);
  useEffect(() => {
    if (!ref) {
      return;
    }

    if (typeof ref === 'function') {
      ref(innerRef.current);
    } else {
      ref.current = innerRef.current;
    }
  });

  return innerRef;
};
