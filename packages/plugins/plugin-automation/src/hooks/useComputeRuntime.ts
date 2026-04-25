//
// Copyright 2025 DXOS.org
//

import { useCapabilities } from '@dxos/app-framework/ui';
import { SpaceId } from '@dxos/keys';

import { AutomationCapabilities } from '../types';

/**
 * Resolves the compute runtime for a space.
 * Returns undefined if the AutomationPlugin is not loaded or spaceId is not provided.
 */
export const useComputeRuntime = (id: SpaceId | undefined): AutomationCapabilities.ComputeRuntime | undefined => {
  const [computeRuntime] = useCapabilities(AutomationCapabilities.ComputeRuntime);
  if (!computeRuntime || id === undefined) {
    return undefined;
  }

  return computeRuntime.getRuntime(id);
};
