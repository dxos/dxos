//
// Copyright 2024 DXOS.org
//

/* eslint-disable no-console */

import { type DependencyList, useEffect, useRef } from 'react';

/**
 * Util to log deps that have changed.
 */
export const useDebugDeps = (deps: DependencyList = [], active = true) => {
  const lastDeps = useRef<DependencyList>([]);
  useEffect(() => {
    console.group('deps changed', { previous: lastDeps.current.length, current: deps.length });
    for (let i = 0; i < Math.max(lastDeps.current.length ?? 0, deps.length ?? 0); i++) {
      if (lastDeps.current[i] !== deps[i] && active) {
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
