//
// Copyright 2025 DXOS.org
//

import { AppCapability } from '@dxos/app-toolkit';

export const SettingsAppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'), {
  name: 'SettingsAppGraphBuilder',
});
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'));
export const ReactSurface = AppCapability.surface(() => import('./react-surface'));
