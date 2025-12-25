//
// Copyright 2025 DXOS.org
//

import { useEffect, useRef } from 'react';

export const useTimeout = (callback?: () => Promise<void>, delay = 0, deps: any[] = []) => {
  const callbackRef = useRef(callback);
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay == null) {
      return;
    }

    const t = setTimeout(() => callbackRef.current?.(), delay);
    return () => clearTimeout(t);
  }, [delay, ...deps]);
};

export const useInterval = (
  callback?: (() => Promise<void | boolean>) | (() => void | boolean),
  delay = 0,
  deps: any[] = [],
) => {
  const callbackRef = useRef(callback);
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay == null) {
      return;
    }

    const i = setInterval(async () => {
      const result = await callbackRef.current?.();
      if (result === false) {
        clearInterval(i);
      }
    }, delay);
    return () => clearInterval(i);
  }, [delay, ...deps]);
};
