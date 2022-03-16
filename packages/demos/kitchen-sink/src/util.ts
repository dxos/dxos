//
// Copyright 2022 DXOS.org
//

import { EffectCallback, useEffect, useRef } from 'react';

// TODO(burdon): Factor hook utils (incl. gem useStateWithRef).

/**
 * Maintains an up-to-date reference to a changing value.
 * @param value
 */
export const useUpdatedRef = <T> (value: T) => {
  const ref = useRef<T>(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
};

/**
 * Effect with timer.
 * @param f
 * @param deps
 * @param delay
 */
export const useDebouncedEffect = (f: EffectCallback, deps: any[], delay = 1000) => {
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(f, delay);
  }, deps);
};
