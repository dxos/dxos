//
// Copyright 2025 DXOS.org
//

import { useEffect, useRef } from 'react';

export const useTimeout = (callback: (() => Promise<void>) | undefined, delay = 0, deps: any[] = []) => {
  const callbackRef = useRef(callback);
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay == null) {
      return;
    }

    const timeout = setTimeout(() => callbackRef.current?.(), delay);
    return () => clearTimeout(timeout);
  }, [delay, ...deps]);
};
