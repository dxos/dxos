//
// Copyright 2025 DXOS.org
//

import type { Effect } from 'effect';
import { useCallback } from 'react';

import { useCapability } from '@dxos/app-framework';
import type { Space } from '@dxos/client/echo';

import { AssistantCapabilities } from '../capabilities';

/**
 * Create an effectful function that has access to compute services
 */
export const useComputeRuntimeCallback = <T>(
  space: Space,
  fn: () => Effect.Effect<T, any, AssistantCapabilities.ComputeServices>,
  deps?: React.DependencyList,
): (() => Promise<T>) => {
  const computeRuntime = useCapability(AssistantCapabilities.ComputeRuntime);
  const runtime = computeRuntime.getRuntime(space.id);

  return useCallback(() => runtime.runPromise(fn()), [runtime, ...(deps ?? [])]);
};
