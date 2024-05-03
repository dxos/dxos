//
// Copyright 2024 DXOS.org
//
/* eslint-disable no-console */

import { type DependencyList, useEffect, useRef } from 'react';

/**
 * Util to log deps that have changed.
 */
export const useDebugReactDeps = (deps: DependencyList = []) => {
  const lastDeps = useRef<DependencyList>([]);
  useEffect(() => {
    console.group('deps changed', { old: lastDeps.current.length, new: deps.length });
    for (let i = 0; i < Math.max(lastDeps.current.length ?? 0, deps.length ?? 0); i++) {
      console.log(i, lastDeps.current[i] === deps[i] ? 'SAME' : 'CHANGED', {
        previous: lastDeps.current[i],
        current: deps[i],
      });
    }

    console.groupEnd();
    lastDeps.current = deps;
  }, deps);
};
