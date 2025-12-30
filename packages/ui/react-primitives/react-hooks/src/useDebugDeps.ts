//
// Copyright 2024 DXOS.org
//

import { type DependencyList, useEffect, useRef } from 'react';

import { log } from '@dxos/log';

/**
 * Util to log deps that have changed.
 */
export const useDebugDeps = (deps: DependencyList = [], label = 'useDebugDeps', active = true) => {
  const lastDeps = useRef<DependencyList>([]);
  useEffect(() => {
    if (!active) {
      return;
    }

    const diff: Record<number, { previous: any; current: any }> = {};
    for (let i = 0; i < Math.max(lastDeps.current.length ?? 0, deps.length ?? 0); i++) {
      if (lastDeps.current[i] !== deps[i] || i > lastDeps.current.length) {
        diff[i] = {
          previous: lastDeps.current[i],
          current: deps[i],
        };
      }
    }

    if (Object.keys(diff).length > 0) {
      log.warn(`Updated: ${label} [${lastDeps.current.length}/${deps.length}]`, diff);
    }

    lastDeps.current = deps;
  }, [...deps, active]);
};
