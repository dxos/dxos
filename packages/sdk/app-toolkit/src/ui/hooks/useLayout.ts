//
// Copyright 2025 DXOS.org
//

import { useAtomCapability } from '@dxos/app-framework/Hooks';

import { AppCapabilities } from '../../app-framework/index.ts';

/**
 * Hook to get the current layout state.
 * Automatically subscribes to changes.
 */
export const useLayout = (): AppCapabilities.Layout => useAtomCapability(AppCapabilities.Layout);
