//
// Copyright 2024 DXOS.org
//

import { type DependencyList, useEffect, useRef } from 'react';

/**
 * Util to log deps that have changed.
 */
export const useDebugDeps = (deps: DependencyList = []) => {
  const lastDeps = useRef<DependencyList>([]);
  useEffect(() => {
    console.group('deps changed', { previous: lastDeps.current.length, current: deps.length });
    for (let i = 0; i < Math.max(lastDeps.current.length ?? 0, deps.length ?? 0); i++) {
      if (lastDeps.current[i] !== deps[i]) {
        console.log('changed', {
          index: i,
          previous: lastDeps.current[i],
          current: deps[i],
        });
      }
    }
    console.groupEnd();
    lastDeps.current = deps;
  }, deps);
};
