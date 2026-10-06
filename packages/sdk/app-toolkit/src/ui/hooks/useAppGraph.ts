//
// Copyright 2025 DXOS.org
//

import * as Hooks from '@dxos/app-framework/Hooks';

import { AppCapabilities } from '../../app-framework/index.ts';

/**
 * Hook to get the current app graph.
 */
export const useAppGraph = (): AppCapabilities.AppGraph => Hooks.useCapability(AppCapabilities.AppGraph);
