//
// Copyright 2022 DXOS.org
//

import { computed, effect } from '@preact-signals/safe-react';
import { type DependencyList, useEffect, useMemo, useRef } from 'react';

/**
 * Like `useEffect` but also tracks signals inside of the callback.
 */
export const useSignalsEffect = (cb: () => void | (() => void), deps?: DependencyList) => {
  const callback = useRef(cb);
  callback.current = cb;
  useEffect(() => {
    return effect(() => {
      return callback.current();
    });
  }, deps ?? []);
};

/**
 * Like `useMemo` but also tracks signals inside of the callback.
 */
export const useSignalsMemo = <T>(cb: () => T, deps?: DependencyList) => {
  return useMemo(() => computed(cb), deps ?? []).value;
};
