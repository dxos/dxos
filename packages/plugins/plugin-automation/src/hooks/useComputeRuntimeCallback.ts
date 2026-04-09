//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import { type DependencyList, useCallback } from 'react';

import { type Key } from '@dxos/echo';

import { AutomationCapabilities } from '#types';
import { useComputeRuntime } from './useComputeRuntime';

/**
 * Create an effectful function that has access to compute services
 */
// TODO(burdon): Factor out (figure out cross-plugin capabilities dependencies).
export const useComputeRuntimeCallback = <T>(
  id: Key.SpaceId | undefined,
  fn: () => Effect.Effect<T, any, AutomationCapabilities.ComputeServices>,
  deps?: DependencyList,
): (() => Promise<T>) => {
  const runtime = useComputeRuntime(id);

  return useCallback(() => {
    if (!runtime) {
      throw new TypeError('Space not provided to useComputeRuntimeCallback');
    }

    return runtime.runPromise(fn());
  }, [runtime, ...(deps ?? [])]);
};
