//
// Copyright 2025 DXOS.org
//

import { useEffect } from 'react';

import { useCapabilities } from '@dxos/app-framework/ui';
import { SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';

import { AutomationCapabilities } from '../types';

/**
 * Resolves the compute runtime for a space.
 * Returns undefined if the AutomationPlugin is not loaded or spaceId is not provided.
 */
export const useComputeRuntime = (id: SpaceId | undefined): AutomationCapabilities.ComputeRuntime | undefined => {
  const [computeRuntime] = useCapabilities(AutomationCapabilities.ComputeRuntime);
  // One log per change of (capability availability, spaceId) so we can see when
  // the React subscription actually observes the contributed runtime.
  useEffect(() => {
    log('useComputeRuntime', { hasCapability: !!computeRuntime, spaceId: id });
  }, [!!computeRuntime, id]);

  if (!computeRuntime || id === undefined) {
    return undefined;
  }

  return computeRuntime.getRuntime(id);
};
