//
// Copyright 2025 DXOS.org
//

import type { Effect } from 'effect';
import { useCallback } from 'react';

import { useCapability } from '@dxos/app-framework';
import type { Space } from '@dxos/react-client/echo';

import { AutomationCapabilities } from '../capabilities';

/**
 * Create an effectful function that has access to compute services
 */
export const useComputeRuntimeCallback = <T>(
  space: Space | undefined,
  fn: () => Effect.Effect<T, any, AutomationCapabilities.ComputeServices>,
  deps?: React.DependencyList,
): (() => Promise<T>) => {
  const computeRuntime = useCapability(AutomationCapabilities.ComputeRuntime);
  const runtime = space !== undefined ? computeRuntime.getRuntime(space.id) : undefined;

  return useCallback(() => {
    if (!runtime) {
      throw new TypeError('Space not provided to useComputeRuntimeCallback');
    }
    return runtime.runPromise(fn());
  }, [runtime, ...(deps ?? [])]);
};
