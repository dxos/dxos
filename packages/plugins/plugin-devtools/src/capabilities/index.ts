//
// Copyright 2025 DXOS.org
//

import { AppCapabilities, AppCapability } from '@dxos/app-toolkit';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'), {
  requires: [AppCapabilities.AppGraph],
});
export const ReactContext = AppCapability.reactContext(() => import('./react-context'));
export const ReactSurface = AppCapability.surface(() => import('./react-surface'));
