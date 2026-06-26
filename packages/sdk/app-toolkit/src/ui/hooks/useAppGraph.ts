//
// Copyright 2025 DXOS.org
//

import { useCapability } from '@dxos/app-framework/ui';

import { AppCapabilities } from '../../app-framework';

/**
 * Hook to get the current app graph.
 */
export const useAppGraph = (): AppCapabilities.AppGraph => useCapability(AppCapabilities.AppGraph);
