//
// Copyright 2025 DXOS.org
//

import { useCapability } from '@dxos/app-framework/ui';
import { SpaceId } from '@dxos/keys';

import { AutomationCapabilities } from '../types';

/**
 * Resolves the compute runtime for a space.
 */
export const useComputeRuntime = (id: SpaceId | undefined): AutomationCapabilities.ComputeRuntime | undefined => {
  const computeRuntime = useCapability(AutomationCapabilities.ComputeRuntime);
  return id !== undefined ? computeRuntime.getRuntime(id) : undefined;
};
