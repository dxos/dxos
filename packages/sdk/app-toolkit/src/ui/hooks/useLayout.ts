//
// Copyright 2025 DXOS.org
//

import { useAtomCapability } from '@dxos/app-framework/ui';

import { AppCapabilities } from '../../capabilities';

/**
 * Hook to get the current layout state.
 * Automatically subscribes to changes.
 */
export const useLayout = (): AppCapabilities.Layout => useAtomCapability(AppCapabilities.Layout);
