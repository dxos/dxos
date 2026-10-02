//
// Copyright 2025 DXOS.org
//

import { useCapability } from '@dxos/app-framework/Hooks';

import { AppCapabilities } from '../../app-framework/index.ts';

/**
 * Hook to get the current app graph.
 */
export const useAppGraph = (): AppCapabilities.AppGraph => useCapability(AppCapabilities.AppGraph);
