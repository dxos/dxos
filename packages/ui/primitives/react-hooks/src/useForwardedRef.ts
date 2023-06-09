//
// Copyright 2022 DXOS.org
//

import { useRef, useEffect } from 'react';

export const useForwardedRef = <T>(ref: React.ForwardedRef<T>) => {
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
