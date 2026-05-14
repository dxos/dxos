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
export const useComputeRuntimeCallback = <T>(
  id: Key.SpaceId | undefined,
  operation: () => Effect.Effect<T, any, AutomationCapabilities.ComputeServices>,
  deps?: DependencyList,
): (() => Promise<T>) => {
  const runtime = useComputeRuntime(id);

  return useCallback(() => {
    if (!runtime) {
      throw new TypeError('Space not provided to useComputeRuntimeCallback');
    }

    return runtime.runPromise(operation());
  }, [runtime, ...(deps ?? [])]);
};
