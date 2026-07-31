//
// Copyright 2025 DXOS.org
//

import { SettingsOperation } from '@dxos/app-toolkit';
import { OperationHandlerSet } from '@dxos/compute';

export const SettingsOperationHandlerSet = OperationHandlerSet.keyed([
  [SettingsOperation.Open, () => import('./open')],
  [SettingsOperation.OpenPluginRegistry, () => import('./open-plugin-registry')],
]);
