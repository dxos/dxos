//
// Copyright 2025 DXOS.org
//

import { useCapability } from '@dxos/app-framework/ui';
import { AutomationCapabilities } from '../types';
import { SpaceId } from '@dxos/keys';

/**
 * Resolves the compute runtime for a space.
 */
export const useComputeRuntime = (id: SpaceId | undefined): AutomationCapabilities.ComputeRuntime | undefined => {
  const computeRuntime = useCapability(AutomationCapabilities.ComputeRuntime);
  return id !== undefined ? computeRuntime.getRuntime(id) : undefined;
};
